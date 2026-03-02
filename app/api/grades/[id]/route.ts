import { createClient } from '@/lib/supabase/server';
import { getOrCreateActiveSchoolYearId } from '@/lib/school-years/server';
import { NextRequest, NextResponse } from 'next/server';

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const activeSchoolYearId = await getOrCreateActiveSchoolYearId(supabase, user.id);

    const { id } = await params;
    const { grade, gradeType, weight, description, gradeDate } = await request.json();

    // Verify ownership
    const { data: gradeRecord } = await supabase
      .from('grades')
      .select('user_id')
      .eq('id', id)
      .eq('school_year_id', activeSchoolYearId)
      .single();

    if (!gradeRecord || gradeRecord.user_id !== user.id) {
      return NextResponse.json({ error: 'Not found or unauthorized' }, { status: 404 });
    }

    const updateData: {
      grade?: number;
      grade_type?: string;
      weight?: number;
      description?: string | null;
      grade_date?: string;
    } = {};

    if (grade !== undefined) {
      const parsedGrade = Number(grade);
      if (!Number.isInteger(parsedGrade) || parsedGrade < 1 || parsedGrade > 6) {
        return NextResponse.json(
          { error: 'grade must be an integer between 1 and 6' },
          { status: 400 }
        );
      }
      updateData.grade = parsedGrade;
    }
    if (gradeType !== undefined) updateData.grade_type = gradeType;
    if (weight !== undefined) {
      const parsedWeight = Number(weight);
      if (!Number.isFinite(parsedWeight) || parsedWeight <= 0) {
        return NextResponse.json(
          { error: 'weight must be a positive number' },
          { status: 400 }
        );
      }
      updateData.weight = parsedWeight;
    }
    if (description !== undefined) updateData.description = description;
    if (gradeDate !== undefined) updateData.grade_date = gradeDate;

    const { data, error } = await supabase
      .from('grades')
      .update(updateData)
      .eq('id', id)
      .eq('school_year_id', activeSchoolYearId)
      .select()
      .single();

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

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const activeSchoolYearId = await getOrCreateActiveSchoolYearId(supabase, user.id);

    const { id } = await params;

    // Verify ownership
    const { data: gradeRecord } = await supabase
      .from('grades')
      .select('user_id')
      .eq('id', id)
      .eq('school_year_id', activeSchoolYearId)
      .single();

    if (!gradeRecord || gradeRecord.user_id !== user.id) {
      return NextResponse.json({ error: 'Not found or unauthorized' }, { status: 404 });
    }

    const { error } = await supabase
      .from('grades')
      .delete()
      .eq('id', id)
      .eq('school_year_id', activeSchoolYearId);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
