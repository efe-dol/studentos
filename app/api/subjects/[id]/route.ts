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

    const { name, type, color, default_room, default_teacher } = await request.json();
    const { id } = await params;

    // Verify ownership
    const { data: subject } = await supabase
      .from('subjects')
      .select('user_id')
      .eq('id', id)
      .eq('school_year_id', activeSchoolYearId)
      .single();

    if (!subject || subject.user_id !== user.id) {
      return NextResponse.json({ error: 'Not found or unauthorized' }, { status: 404 });
    }

    const updateData: any = {};
    if (name !== undefined) updateData.name = name;
    if (type !== undefined) updateData.type = type;
    if (color !== undefined) updateData.color = color;
    if (default_room !== undefined) updateData.default_room = default_room?.trim() || null;
    if (default_teacher !== undefined) updateData.default_teacher = default_teacher?.trim() || null;

    const { data, error } = await supabase
      .from('subjects')
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
    const { data: subject } = await supabase
      .from('subjects')
      .select('user_id')
      .eq('id', id)
      .eq('school_year_id', activeSchoolYearId)
      .single();

    if (!subject || subject.user_id !== user.id) {
      return NextResponse.json({ error: 'Not found or unauthorized' }, { status: 404 });
    }

    const { error } = await supabase
      .from('subjects')
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
