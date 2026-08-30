import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { NextRequest, NextResponse } from 'next/server';

// GDPR Art. 17: self-service account deletion.
// Deleting the auth user cascades to every table that references
// auth.users(id) ON DELETE CASCADE (profiles, subjects, grades, todos,
// appointments, homework, schedule_entries, push_subscriptions,
// appointment_reminders, school_years, schedule_shares).
export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Require an explicit confirmation string so a stray/forged request cannot
    // wipe an account on its own.
    const body = await request.json().catch(() => null);
    if (body?.confirm !== 'DELETE') {
      return NextResponse.json({ error: 'Confirmation required' }, { status: 400 });
    }

    let adminClient: ReturnType<typeof createAdminClient>;
    try {
      adminClient = createAdminClient();
    } catch {
      return NextResponse.json(
        { error: 'Konto-Löschung ist auf diesem Server nicht konfiguriert. Bitte an den Administrator wenden.' },
        { status: 501 }
      );
    }

    const { error } = await adminClient.auth.admin.deleteUser(user.id);
    if (error) {
      return NextResponse.json({ error: 'Konto konnte nicht gelöscht werden.' }, { status: 500 });
    }

    await supabase.auth.signOut().catch(() => undefined);

    return NextResponse.json({ success: true }, { status: 200 });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
