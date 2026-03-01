import type { SupabaseClient } from '@supabase/supabase-js';

type ReminderRow = {
  appointment_id: string;
  user_id: string;
  reminder_type: 'week' | 'day';
  scheduled_for: string;
  sent_at: null;
};

const toIso = (timestamp: number) => new Date(timestamp).toISOString();

export const buildReminderRows = (
  appointmentId: string,
  userId: string,
  startsAtIso: string
): ReminderRow[] => {
  const startTimestamp = new Date(startsAtIso).getTime();
  const weekBefore = toIso(startTimestamp - 7 * 24 * 60 * 60 * 1000);
  const dayBefore = toIso(startTimestamp - 24 * 60 * 60 * 1000);

  return [
    {
      appointment_id: appointmentId,
      user_id: userId,
      reminder_type: 'week',
      scheduled_for: weekBefore,
      sent_at: null,
    },
    {
      appointment_id: appointmentId,
      user_id: userId,
      reminder_type: 'day',
      scheduled_for: dayBefore,
      sent_at: null,
    },
  ];
};

export const upsertAppointmentReminders = async (
  supabase: SupabaseClient,
  appointmentId: string,
  userId: string,
  startsAtIso: string
) => {
  const rows = buildReminderRows(appointmentId, userId, startsAtIso);

  return supabase
    .from('appointment_reminders')
    .upsert(rows, { onConflict: 'appointment_id,reminder_type' });
};
