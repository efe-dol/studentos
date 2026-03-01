import { createClient } from '@/lib/supabase/server';
import { upsertAppointmentReminders } from '@/lib/appointments/reminders';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const limit = searchParams.get('limit');
    const onlyUpcoming = searchParams.get('upcoming') === 'true';

    let query = supabase
      .from('appointments')
      .select('*')
      .eq('user_id', user.id);

    if (onlyUpcoming) {
      query = query.gte('starts_at', new Date().toISOString());
    }

    query = query.order('starts_at', { ascending: true });

    if (limit) {
      query = query.limit(parseInt(limit, 10));
    }

    const { data: appointments, error } = await query;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ appointments: appointments || [] }, { status: 200 });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { name, description, starts_at, color } = body;

    if (!name || !starts_at) {
      return NextResponse.json(
        { error: 'Name and starts_at are required' },
        { status: 400 }
      );
    }

    const { data: appointment, error } = await supabase
      .from('appointments')
      .insert({
        user_id: user.id,
        name,
        description: description || null,
        starts_at,
        color: color || '#3b82f6',
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const { error: reminderError } = await upsertAppointmentReminders(
      supabase,
      appointment.id,
      user.id,
      appointment.starts_at
    );

    if (reminderError) {
      return NextResponse.json({ error: reminderError.message }, { status: 500 });
    }

    return NextResponse.json({ appointment }, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
