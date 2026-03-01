import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

const VALID_WEEKDAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'];

const isMissingIsBreakColumnError = (error: { message?: string; details?: string; hint?: string } | null) => {
  const combined = `${error?.message || ''} ${error?.details || ''} ${error?.hint || ''}`.toLowerCase();
  return combined.includes('is_break') && (combined.includes('column') || combined.includes('schema cache'));
};

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

    const { data, error } = await supabase
      .from('schedule_entries')
      .select('id, weekday, start_time, end_time, room, teacher, created_at, is_break, subject_id, subjects(id, name, color, type)')
      .eq('user_id', user.id)
      .in('weekday', VALID_WEEKDAYS)
      .order('weekday', { ascending: true })
      .order('start_time', { ascending: true });

    if (error && !isMissingIsBreakColumnError(error)) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (error && isMissingIsBreakColumnError(error)) {
      const { data: fallbackData, error: fallbackError } = await supabase
        .from('schedule_entries')
        .select('id, weekday, start_time, end_time, room, teacher, created_at, subject_id, subjects(id, name, color, type)')
        .eq('user_id', user.id)
        .in('weekday', VALID_WEEKDAYS)
        .order('weekday', { ascending: true })
        .order('start_time', { ascending: true });

      if (fallbackError) {
        return NextResponse.json({ error: fallbackError.message }, { status: 500 });
      }

      const normalizedFallback = (fallbackData || []).map((entry) => ({
        ...entry,
        is_break: false,
      }));

      return NextResponse.json(
        {
          schedule: normalizedFallback,
          migrationRequired: true,
          warning: 'The database migration for is_break is missing. Please run migration 012_add_break_option_to_schedule.sql.',
        },
        { status: 200 }
      );
    }

    return NextResponse.json({ schedule: data || [] }, { status: 200 });
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

    const { weekday, start_time, end_time, room, teacher, subject_id, is_break } = await request.json();
    const isBreak = Boolean(is_break);

    if (!weekday || !start_time || !end_time) {
      return NextResponse.json(
        { error: 'weekday, start_time and end_time are required' },
        { status: 400 }
      );
    }

    if (!VALID_WEEKDAYS.includes(weekday)) {
      return NextResponse.json({ error: 'Invalid weekday' }, { status: 400 });
    }

    if (start_time >= end_time) {
      return NextResponse.json({ error: 'start_time must be earlier than end_time' }, { status: 400 });
    }

    if (!isBreak && !subject_id) {
      return NextResponse.json({ error: 'subject_id is required for non-break entries' }, { status: 400 });
    }

    if (!isBreak) {
      const { data: subject, error: subjectError } = await supabase
        .from('subjects')
        .select('id')
        .eq('id', subject_id)
        .eq('user_id', user.id)
        .single();

      if (subjectError || !subject) {
        return NextResponse.json({ error: 'Subject not found or unauthorized' }, { status: 404 });
      }
    }

    const { data: entry, error } = await supabase
      .from('schedule_entries')
      .insert({
        user_id: user.id,
        subject_id: isBreak ? null : subject_id,
        is_break: isBreak,
        weekday,
        start_time,
        end_time,
        room: room?.trim() || null,
        teacher: teacher?.trim() || null,
      })
      .select('id, weekday, start_time, end_time, room, teacher, created_at, is_break, subject_id, subjects(id, name, color, type)')
      .single();

    if (error && !isMissingIsBreakColumnError(error)) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (error && isMissingIsBreakColumnError(error)) {
      if (isBreak) {
        return NextResponse.json(
          {
            error:
              'Die Datenbank ist noch nicht auf dem neuesten Stand (Spalte is_break fehlt). Bitte Migration 012_add_break_option_to_schedule.sql ausführen.',
          },
          { status: 400 }
        );
      }

      const { data: fallbackEntry, error: fallbackInsertError } = await supabase
        .from('schedule_entries')
        .insert({
          user_id: user.id,
          subject_id,
          weekday,
          start_time,
          end_time,
          room: room?.trim() || null,
          teacher: teacher?.trim() || null,
        })
        .select('id, weekday, start_time, end_time, room, teacher, created_at, subject_id, subjects(id, name, color, type)')
        .single();

      if (fallbackInsertError) {
        return NextResponse.json({ error: fallbackInsertError.message }, { status: 500 });
      }

      return NextResponse.json(
        {
          entry: {
            ...fallbackEntry,
            is_break: false,
          },
          migrationRequired: true,
          warning: 'Break entries require migration 012_add_break_option_to_schedule.sql.',
        },
        { status: 201 }
      );
    }

    return NextResponse.json({ entry }, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
