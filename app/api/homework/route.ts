import { createClient } from '@/lib/supabase/server';
import { getOrCreateActiveSchoolYearId } from '@/lib/school-years/server';
import { NextRequest, NextResponse } from 'next/server';

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

const cleanupOldHomework = async (
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  schoolYearId: string
) => {
  const cutoff = new Date(Date.now() - THIRTY_DAYS_MS).toISOString();

  await supabase
    .from('homework')
    .delete()
    .eq('user_id', userId)
    .eq('school_year_id', schoolYearId)
    .lt('created_at', cutoff);
};

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

    const activeSchoolYearId = await getOrCreateActiveSchoolYearId(supabase, user.id);

    await cleanupOldHomework(supabase, user.id, activeSchoolYearId);

    const { searchParams } = new URL(request.url);
    const limit = searchParams.get('limit');

    let query = supabase
      .from('homework')
      .select('id, task, homework_date, due_date, priority, created_at, subject_id, subjects(id, name, color, type)')
      .eq('user_id', user.id)
      .eq('school_year_id', activeSchoolYearId)
      .order('due_date', { ascending: true })
      .order('created_at', { ascending: false });

    if (limit) {
      query = query.limit(parseInt(limit, 10));
    }

    const { data, error } = await query;

    if (error) {
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }

    return NextResponse.json({ homework: data || [] }, { status: 200 });
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

    const activeSchoolYearId = await getOrCreateActiveSchoolYearId(supabase, user.id);

    await cleanupOldHomework(supabase, user.id, activeSchoolYearId);

    const { task, homework_date, due_date, priority, subject_id } = await request.json();

    if (!task || !homework_date || !due_date || !priority || !subject_id) {
      return NextResponse.json({ error: 'task, homework_date, due_date, priority and subject_id are required' }, { status: 400 });
    }

    if (!['low', 'medium', 'high', 'urgent'].includes(priority)) {
      return NextResponse.json({ error: 'Invalid priority' }, { status: 400 });
    }

    const { data: subject, error: subjectError } = await supabase
      .from('subjects')
      .select('id')
      .eq('id', subject_id)
      .eq('user_id', user.id)
      .eq('school_year_id', activeSchoolYearId)
      .single();

    if (subjectError || !subject) {
      return NextResponse.json({ error: 'Subject not found or unauthorized' }, { status: 404 });
    }

    const { data: homework, error } = await supabase
      .from('homework')
      .insert({
        user_id: user.id,
        school_year_id: activeSchoolYearId,
        task: String(task).trim(),
        homework_date,
        due_date,
        priority,
        subject_id,
      })
      .select('id, task, homework_date, due_date, priority, created_at, subject_id, subjects(id, name, color, type)')
      .single();

    if (error) {
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }

    return NextResponse.json({ homework }, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
