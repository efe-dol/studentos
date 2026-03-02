import { createClient } from '@/lib/supabase/server';
import { getOrCreateActiveSchoolYearId } from '@/lib/school-years/server';
import { NextRequest, NextResponse } from 'next/server';

const VALID_WEEKDAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'];
const TOKEN_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

type SharedSubject = {
  source_id: string;
  name: string;
  type: 'HAUPTFACH' | 'NEBENFACH';
  color: string;
  default_room?: string | null;
  default_teacher?: string | null;
};

type SharedEntry = {
  weekday: string;
  start_time: string;
  end_time: string;
  room?: string | null;
  teacher?: string | null;
  is_break?: boolean;
  subject_source_id?: string | null;
};

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

    const body = await request.json();
    const token = String(body?.token || '').trim();

    if (!TOKEN_PATTERN.test(token)) {
      return NextResponse.json({ error: 'Ungültiger Share-Link.' }, { status: 400 });
    }

    const { data: share, error: shareError } = await supabase
      .from('schedule_shares')
      .select('payload, expires_at')
      .eq('token', token)
      .single();

    if (shareError || !share) {
      return NextResponse.json({ error: 'Share-Link nicht gefunden.' }, { status: 404 });
    }

    if (new Date(share.expires_at).getTime() <= Date.now()) {
      return NextResponse.json({ error: 'Dieser Share-Link ist abgelaufen.' }, { status: 410 });
    }

    const payload = share.payload as {
      subjects?: SharedSubject[];
      entries?: SharedEntry[];
    };

    const sharedSubjects = Array.isArray(payload?.subjects) ? payload.subjects : [];
    const sharedEntries = Array.isArray(payload?.entries) ? payload.entries : [];

    if (sharedEntries.length === 0) {
      return NextResponse.json({ error: 'Der geteilte Stundenplan enthält keine Einträge.' }, { status: 400 });
    }

    const { data: existingSubjects, error: existingSubjectsError } = await supabase
      .from('subjects')
      .select('id, name, type')
      .eq('user_id', user.id)
      .eq('school_year_id', activeSchoolYearId);

    if (existingSubjectsError) {
      return NextResponse.json({ error: existingSubjectsError.message }, { status: 500 });
    }

    const userSubjects = existingSubjects || [];
    const subjectMap = new Map<string, string>();
    let createdSubjects = 0;

    for (const subject of sharedSubjects) {
      if (!subject?.source_id || !subject?.name || !subject?.type || !subject?.color) continue;

      const existing = userSubjects.find(
        (item) => item.name === subject.name && item.type === subject.type
      );

      if (existing) {
        subjectMap.set(subject.source_id, existing.id);
        continue;
      }

      const { data: insertedSubject, error: insertSubjectError } = await supabase
        .from('subjects')
        .insert({
          user_id: user.id,
          school_year_id: activeSchoolYearId,
          name: subject.name,
          type: subject.type,
          color: subject.color,
          default_room: subject.default_room?.trim() || null,
          default_teacher: subject.default_teacher?.trim() || null,
        })
        .select('id, name, type')
        .single();

      if (insertSubjectError || !insertedSubject) {
        return NextResponse.json(
          { error: insertSubjectError?.message || 'Fächer konnten nicht importiert werden.' },
          { status: 500 }
        );
      }

      createdSubjects++;
      userSubjects.push(insertedSubject);
      subjectMap.set(subject.source_id, insertedSubject.id);
    }

    const scheduleInserts = sharedEntries
      .filter((entry) => {
        return (
          VALID_WEEKDAYS.includes(String(entry.weekday)) &&
          Boolean(entry.start_time) &&
          Boolean(entry.end_time)
        );
      })
      .map((entry) => {
        const isBreak = Boolean(entry.is_break);
        const mappedSubjectId = isBreak ? null : subjectMap.get(String(entry.subject_source_id || '')) || null;

        return {
          user_id: user.id,
          school_year_id: activeSchoolYearId,
          subject_id: mappedSubjectId,
          is_break: isBreak,
          weekday: entry.weekday,
          start_time: entry.start_time,
          end_time: entry.end_time,
          room: entry.room?.trim() || null,
          teacher: isBreak ? null : entry.teacher?.trim() || null,
        };
      })
      .filter((entry) => entry.is_break || Boolean(entry.subject_id));

    if (scheduleInserts.length === 0) {
      return NextResponse.json({ error: 'Keine gültigen Stundenplan-Einträge zum Importieren gefunden.' }, { status: 400 });
    }

    const { error: insertScheduleError } = await supabase
      .from('schedule_entries')
      .insert(scheduleInserts);

    if (insertScheduleError) {
      return NextResponse.json({ error: insertScheduleError.message }, { status: 500 });
    }

    return NextResponse.json(
      {
        success: true,
        importedSubjects: createdSubjects,
        importedEntries: scheduleInserts.length,
      },
      { status: 201 }
    );
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
