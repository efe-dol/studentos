import { createClient } from '@/lib/supabase/server';
import { getOrCreateActiveSchoolYearId } from '@/lib/school-years/server';
import { NextRequest, NextResponse } from 'next/server';

const VALID_WEEKDAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'];

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

    const activeSchoolYearId = await getOrCreateActiveSchoolYearId(supabase, user.id);

    const { data: scheduleEntries, error: scheduleError } = await supabase
      .from('schedule_entries')
      .select('weekday, start_time, end_time, room, teacher, is_break, subject_id')
      .eq('user_id', user.id)
      .eq('school_year_id', activeSchoolYearId)
      .in('weekday', VALID_WEEKDAYS)
      .order('weekday', { ascending: true })
      .order('start_time', { ascending: true });

    if (scheduleError) {
      return NextResponse.json({ error: scheduleError.message }, { status: 500 });
    }

    const entries = scheduleEntries || [];

    if (entries.length === 0) {
      return NextResponse.json(
        { error: 'Du hast keinen Stundenplan zum Teilen.' },
        { status: 400 }
      );
    }

    const subjectIds = Array.from(
      new Set(
        entries
          .filter((entry) => !entry.is_break && entry.subject_id)
          .map((entry) => entry.subject_id as string)
      )
    );

    let subjects: Array<{
      id: string;
      name: string;
      type: 'HAUPTFACH' | 'NEBENFACH';
      color: string;
      default_room: string | null;
      default_teacher: string | null;
    }> = [];

    if (subjectIds.length > 0) {
      const { data: subjectData, error: subjectError } = await supabase
        .from('subjects')
        .select('id, name, type, color, default_room, default_teacher')
        .eq('user_id', user.id)
        .eq('school_year_id', activeSchoolYearId)
        .in('id', subjectIds);

      if (subjectError) {
        return NextResponse.json({ error: subjectError.message }, { status: 500 });
      }

      subjects = (subjectData || []) as typeof subjects;
    }

    const payload = {
      version: 1,
      subjects: subjects.map((subject) => ({
        source_id: subject.id,
        name: subject.name,
        type: subject.type,
        color: subject.color,
        default_room: subject.default_room,
        default_teacher: subject.default_teacher,
      })),
      entries: entries.map((entry) => ({
        weekday: entry.weekday,
        start_time: entry.start_time,
        end_time: entry.end_time,
        room: entry.room,
        teacher: entry.teacher,
        is_break: Boolean(entry.is_break),
        subject_source_id: entry.subject_id,
      })),
    };

    const { data: share, error: shareError } = await supabase
      .from('schedule_shares')
      .insert({
        created_by: user.id,
        payload,
      })
      .select('token, expires_at')
      .single();

    if (shareError || !share) {
      return NextResponse.json(
        { error: shareError?.message || 'Fehler beim Erstellen des Share-Links' },
        { status: 500 }
      );
    }

    const shareUrl = `${request.nextUrl.origin}/dashboard?scheduleShare=${share.token}`;

    return NextResponse.json(
      {
        token: share.token,
        shareUrl,
        expiresAt: share.expires_at,
      },
      { status: 201 }
    );
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
