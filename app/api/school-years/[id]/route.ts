import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const shouldActivate = Boolean(body?.setActive);

    if (shouldActivate) {
      await supabase
        .from('school_years')
        .update({ is_active: false })
        .eq('user_id', user.id)
        .eq('is_active', true);

      const { data: updated, error: updateError } = await supabase
        .from('school_years')
        .update({ is_active: true })
        .eq('id', id)
        .eq('user_id', user.id)
        .select('id, label, grade_level, is_active, created_at')
        .single();

      if (updateError || !updated) {
        return NextResponse.json({ error: 'Schuljahr konnte nicht aktiviert werden.' }, { status: 500 });
      }

      await supabase
        .from('profiles')
        .update({ active_school_year_id: id })
        .eq('id', user.id);

      return NextResponse.json({ schoolYear: updated }, { status: 200 });
    }

    const updateData: { label?: string; grade_level?: number | null } = {};

    if (body?.label !== undefined) {
      updateData.label = String(body.label || '').trim();
    }

    if (body?.gradeLevel !== undefined) {
      if (body.gradeLevel === null || body.gradeLevel === '') {
        updateData.grade_level = null;
      } else {
        const gradeLevel = Number(body.gradeLevel);
        if (!Number.isInteger(gradeLevel) || gradeLevel < 1 || gradeLevel > 13) {
          return NextResponse.json({ error: 'Jahrgangsstufe muss zwischen 1 und 13 liegen.' }, { status: 400 });
        }
        updateData.grade_level = gradeLevel;
      }
    }

    const { data: updated, error: updateError } = await supabase
      .from('school_years')
      .update(updateData)
      .eq('id', id)
      .eq('user_id', user.id)
      .select('id, label, grade_level, is_active, created_at')
      .single();

    if (updateError || !updated) {
      return NextResponse.json({ error: 'Schuljahr konnte nicht aktualisiert werden.' }, { status: 500 });
    }

    return NextResponse.json({ schoolYear: updated }, { status: 200 });
  } catch (error: unknown) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: allYears, error: yearsError } = await supabase
      .from('school_years')
      .select('id, is_active, created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (yearsError) {
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }

    const schoolYears = allYears || [];
    const yearToDelete = schoolYears.find((item) => item.id === id);

    if (!yearToDelete) {
      return NextResponse.json({ error: 'Schuljahr nicht gefunden.' }, { status: 404 });
    }

    if (schoolYears.length <= 1) {
      return NextResponse.json(
        { error: 'Das letzte Schuljahr kann nicht gelöscht werden.' },
        { status: 400 }
      );
    }

    if (yearToDelete.is_active) {
      const fallbackYear = schoolYears.find((item) => item.id !== id);

      if (!fallbackYear) {
        return NextResponse.json(
          { error: 'Kein alternatives Schuljahr zum Umschalten gefunden.' },
          { status: 400 }
        );
      }

      await supabase
        .from('school_years')
        .update({ is_active: false })
        .eq('user_id', user.id)
        .eq('is_active', true);

      const { error: activateError } = await supabase
        .from('school_years')
        .update({ is_active: true })
        .eq('id', fallbackYear.id)
        .eq('user_id', user.id);

      if (activateError) {
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
      }

      await supabase
        .from('profiles')
        .update({ active_school_year_id: fallbackYear.id })
        .eq('id', user.id);
    }

    const { error: deleteError } = await supabase
      .from('school_years')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id);

    if (deleteError) {
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error: unknown) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
