import { createClient } from '@/lib/supabase/server';
import { getOrCreateActiveSchoolYearId } from '@/lib/school-years/server';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const activeSchoolYearId = await getOrCreateActiveSchoolYearId(supabase, user.id);

    const { searchParams } = new URL(request.url);
    const subjectId = searchParams.get('subjectId');

    let query = supabase
      .from('grades')
      .select('*')
      .eq('user_id', user.id)
      .eq('school_year_id', activeSchoolYearId);

    if (subjectId) {
      query = query.eq('subject_id', subjectId);
    }

    const { data, error } = await query.order('grade_date', { ascending: false });

    if (error) {
      return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
    }

    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const activeSchoolYearId = await getOrCreateActiveSchoolYearId(supabase, user.id);

    const { subjectId, grade, gradeType, weight = 1.0, description, gradeDate } = await request.json();

    if (!subjectId || grade === undefined || !gradeType) {
      return NextResponse.json(
        { error: 'subjectId, grade, and gradeType are required' },
        { status: 400 }
      );
    }

    if (!['SCHULAUFGABE', 'MÜNDLICH', 'KURZARBEIT', 'KSL'].includes(gradeType)) {
      return NextResponse.json(
        { error: 'Invalid gradeType' },
        { status: 400 }
      );
    }

    const parsedGrade = Number(grade);
    if (!Number.isInteger(parsedGrade) || parsedGrade < 1 || parsedGrade > 6) {
      return NextResponse.json(
        { error: 'grade must be an integer between 1 and 6' },
        { status: 400 }
      );
    }

    const parsedWeight = Number(weight);
    if (!Number.isFinite(parsedWeight) || parsedWeight <= 0) {
      return NextResponse.json(
        { error: 'weight must be a positive number' },
        { status: 400 }
      );
    }

    // Verify subject ownership
    const { data: subject } = await supabase
      .from('subjects')
      .select('user_id')
      .eq('id', subjectId)
      .eq('school_year_id', activeSchoolYearId)
      .single();

    if (!subject || subject.user_id !== user.id) {
      return NextResponse.json({ error: 'Subject not found or unauthorized' }, { status: 404 });
    }

    const { data, error } = await supabase
      .from('grades')
      .insert({
        subject_id: subjectId,
        user_id: user.id,
        school_year_id: activeSchoolYearId,
        grade: parsedGrade,
        grade_type: gradeType,
        weight: parsedWeight,
        description,
        grade_date: gradeDate || new Date().toISOString(),
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
    }

    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
