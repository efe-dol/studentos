import { createAdminClient } from '@/lib/supabase/admin';
import { sendWebPush } from '@/lib/notifications/webpush';
import { NextRequest, NextResponse } from 'next/server';

type DueReminderRow = {
  id: string;
  reminder_type: 'week' | 'day';
  scheduled_for: string;
  user_id: string;
  appointment_id: string;
  appointments: {
    id: string;
    name: string;
    starts_at: string;
    description: string | null;
  }[];
};

const maxBatchSize = 200;

const getReminderText = (type: 'week' | 'day') =>
  type === 'week' ? 'in einer Woche' : 'morgen';

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    const expectedSecret = process.env.CRON_SECRET;

    if (!expectedSecret || authHeader !== `Bearer ${expectedSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = createAdminClient();

    const { data: dueReminders, error: remindersError } = await supabase
      .from('appointment_reminders')
      .select('id, reminder_type, scheduled_for, user_id, appointment_id, appointments(id, name, starts_at, description)')
      .is('sent_at', null)
      .lte('scheduled_for', new Date().toISOString())
      .order('scheduled_for', { ascending: true })
      .limit(maxBatchSize);

    if (remindersError) {
      return NextResponse.json({ error: remindersError.message }, { status: 500 });
    }

    const reminders = (dueReminders || []) as DueReminderRow[];

    if (reminders.length === 0) {
      return NextResponse.json({ processed: 0, sent: 0, skipped: 0 }, { status: 200 });
    }

    const userIds = [...new Set(reminders.map((reminder) => reminder.user_id))];

    const { data: subscriptions, error: subscriptionError } = await supabase
      .from('push_subscriptions')
      .select('id, user_id, endpoint, p256dh, auth')
      .in('user_id', userIds);

    if (subscriptionError) {
      return NextResponse.json({ error: subscriptionError.message }, { status: 500 });
    }

    const subscriptionsByUser = new Map<string, typeof subscriptions>();
    (subscriptions || []).forEach((subscription) => {
      const existing = subscriptionsByUser.get(subscription.user_id) || [];
      existing.push(subscription);
      subscriptionsByUser.set(subscription.user_id, existing);
    });

    let sentCount = 0;
    let skippedCount = 0;
    const deliveredReminderIds: string[] = [];
    const invalidSubscriptionIds: string[] = [];

    for (const reminder of reminders) {
      const appointment = reminder.appointments?.[0];

      if (!appointment) {
        skippedCount += 1;
        deliveredReminderIds.push(reminder.id);
        continue;
      }

      const userSubscriptions = subscriptionsByUser.get(reminder.user_id) || [];
      if (userSubscriptions.length === 0) {
        skippedCount += 1;
        continue;
      }

      const startsAt = new Date(appointment.starts_at);
      const dateText = startsAt.toLocaleDateString('de-DE');
      const timeText = startsAt.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });

      const payload = {
        title: 'StudentOS Erinnerung',
        body: `Dein Termin "${appointment.name}" ist ${getReminderText(reminder.reminder_type)} (${dateText} um ${timeText}).`,
        data: {
          appointmentId: reminder.appointment_id,
          url: '/dashboard',
        },
      };

      let deliveredForReminder = false;

      for (const subscription of userSubscriptions) {
        try {
          await sendWebPush(
            {
              endpoint: subscription.endpoint,
              keys: {
                p256dh: subscription.p256dh,
                auth: subscription.auth,
              },
            },
            payload
          );
          deliveredForReminder = true;
        } catch (error: unknown) {
          const statusCode =
            typeof error === 'object' && error !== null && 'statusCode' in error
              ? Number((error as { statusCode?: number }).statusCode)
              : undefined;
          if (statusCode === 404 || statusCode === 410) {
            invalidSubscriptionIds.push(subscription.id);
          }
        }
      }

      if (deliveredForReminder) {
        sentCount += 1;
        deliveredReminderIds.push(reminder.id);
      } else {
        skippedCount += 1;
      }
    }

    if (deliveredReminderIds.length > 0) {
      await supabase
        .from('appointment_reminders')
        .update({ sent_at: new Date().toISOString() })
        .in('id', deliveredReminderIds);
    }

    if (invalidSubscriptionIds.length > 0) {
      await supabase
        .from('push_subscriptions')
        .delete()
        .in('id', [...new Set(invalidSubscriptionIds)]);
    }

    return NextResponse.json(
      {
        processed: reminders.length,
        sent: sentCount,
        skipped: skippedCount,
      },
      { status: 200 }
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
