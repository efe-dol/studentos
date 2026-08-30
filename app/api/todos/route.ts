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
    const limit = searchParams.get('limit');
    const sortBy = searchParams.get('sortBy') || 'created_at';
    const onlyIncomplete = searchParams.get('onlyIncomplete') === 'true';

    let query = supabase
      .from('todos')
      .select('*')
      .eq('user_id', user.id)
      .eq('school_year_id', activeSchoolYearId);

    if (onlyIncomplete) {
      query = query.eq('is_completed', false);
    }

    // Sort by priority (urgent > high > medium > low) and due_date
    if (sortBy === 'priority') {
      query = query
        .order('priority', { ascending: false })
        .order('due_date', { ascending: true, nullsFirst: false });
    } else if (sortBy === 'due_date') {
      query = query.order('due_date', { ascending: true, nullsFirst: false });
    } else {
      query = query.order('created_at', { ascending: false });
    }

    if (limit) {
      query = query.limit(parseInt(limit));
    }

    const { data: todos, error } = await query;

    if (error) {
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }

    return NextResponse.json({ todos }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
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

    const body = await request.json();
    const { title, description, due_date, priority } = body;

    if (!title) {
      return NextResponse.json({ error: 'Title is required' }, { status: 400 });
    }

    const { data: todo, error } = await supabase
      .from('todos')
      .insert({
        user_id: user.id,
        school_year_id: activeSchoolYearId,
        title,
        description,
        due_date,
        priority: priority || 'medium',
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }

    return NextResponse.json({ todo }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
