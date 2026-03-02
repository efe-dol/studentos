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

    const { data, error } = await supabase
      .from('subjects')
      .select('*')
      .eq('user_id', user.id)
      .eq('school_year_id', activeSchoolYearId)
      .order('type', { ascending: false })
      .order('name', { ascending: true });

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

    const activeSchoolYearId = await getOrCreateActiveSchoolYearId(supabase, user.id);

    const { name, type, color, default_room, default_teacher } = await request.json();

    if (!name || !type || !color) {
      return NextResponse.json(
        { error: 'Name, type, and color are required' },
        { status: 400 }
      );
    }

    if (!['HAUPTFACH', 'NEBENFACH'].includes(type)) {
      return NextResponse.json(
        { error: 'Invalid type. Must be HAUPTFACH or NEBENFACH' },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from('subjects')
      .insert({
        user_id: user.id,
        school_year_id: activeSchoolYearId,
        name,
        type,
        color,
        default_room: default_room?.trim() || null,
        default_teacher: default_teacher?.trim() || null,
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
