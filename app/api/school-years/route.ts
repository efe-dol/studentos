import { createClient } from '@/lib/supabase/server';
import { getOrCreateActiveSchoolYearId } from '@/lib/school-years/server';
import { NextRequest, NextResponse } from 'next/server';

const buildLabelFromGrade = (gradeLevel?: number | null) => {
  if (!gradeLevel) return null;
  return `${gradeLevel}. Jahrgangsstufe`;
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

    const activeYearId = await getOrCreateActiveSchoolYearId(supabase, user.id);

    const { data, error } = await supabase
      .from('school_years')
      .select('id, label, grade_level, is_active, created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }

    return NextResponse.json({ schoolYears: data || [], activeYearId }, { status: 200 });
  } catch (error: unknown) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
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
    const gradeLevelRaw = body?.gradeLevel;
    const gradeLevel = gradeLevelRaw === undefined || gradeLevelRaw === null || gradeLevelRaw === ''
      ? null
      : Number(gradeLevelRaw);

    if (gradeLevel !== null && (!Number.isInteger(gradeLevel) || gradeLevel < 1 || gradeLevel > 13)) {
      return NextResponse.json({ error: 'Jahrgangsstufe muss zwischen 1 und 13 liegen.' }, { status: 400 });
    }

    const label = String(body?.label || '').trim() || buildLabelFromGrade(gradeLevel) || 'Neues Schuljahr';

    await supabase
      .from('school_years')
      .update({ is_active: false })
      .eq('user_id', user.id)
      .eq('is_active', true);

    const { data: inserted, error: insertError } = await supabase
      .from('school_years')
      .insert({
        user_id: user.id,
        label,
        grade_level: gradeLevel,
        is_active: true,
      })
      .select('id, label, grade_level, is_active, created_at')
      .single();

    if (insertError || !inserted) {
      return NextResponse.json({ error: 'Schuljahr konnte nicht erstellt werden.' }, { status: 500 });
    }

    await supabase
      .from('profiles')
      .update({ active_school_year_id: inserted.id })
      .eq('id', user.id);

    return NextResponse.json({ schoolYear: inserted }, { status: 201 });
  } catch (error: unknown) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
