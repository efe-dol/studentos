import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

// GDPR Art. 15/20: let a user download everything stored about them.
// All reads run through the user's session client, so RLS guarantees only
// their own rows are returned.
export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const tables = [
      'profiles',
      'school_years',
      'subjects',
      'grades',
      'todos',
      'appointments',
      'homework',
      'schedule_entries',
      'push_subscriptions',
      'appointment_reminders',
    ] as const;

    const data: Record<string, unknown> = {
      exported_at: new Date().toISOString(),
      account: { id: user.id, email: user.email ?? null, created_at: user.created_at ?? null },
    };

    for (const table of tables) {
      const { data: rows } = await supabase.from(table).select('*');
      data[table] = rows ?? [];
    }

    const { data: shares } = await supabase
      .from('schedule_shares')
      .select('token, payload, created_at, expires_at');
    data.schedule_shares = shares ?? [];

    return new NextResponse(JSON.stringify(data, null, 2), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': 'attachment; filename="studentos-export.json"',
        'Cache-Control': 'no-store',
      },
    });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
