import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const subjectId = searchParams.get('subjectId');

    let query = supabase
      .from('grades')
      .select('*')
      .eq('user_id', user.id);

    if (subjectId) {
      query = query.eq('subject_id', subjectId);
    }

    const { data, error } = await query.order('grade_date', { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
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

    // Verify subject ownership
    const { data: subject } = await supabase
      .from('subjects')
      .select('user_id')
      .eq('id', subjectId)
      .single();

    if (!subject || subject.user_id !== user.id) {
      return NextResponse.json({ error: 'Subject not found or unauthorized' }, { status: 404 });
    }

    const { data, error } = await supabase
      .from('grades')
      .insert({
        subject_id: subjectId,
        user_id: user.id,
        grade: parseFloat(grade),
        grade_type: gradeType,
        weight: parseFloat(weight),
        description,
        grade_date: gradeDate || new Date().toISOString(),
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
