import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

const cleanupOldHomework = async (supabase: Awaited<ReturnType<typeof createClient>>, userId: string) => {
  const cutoff = new Date(Date.now() - THIRTY_DAYS_MS).toISOString();

  await supabase
    .from('homework')
    .delete()
    .eq('user_id', userId)
    .lt('created_at', cutoff);
};

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

    await cleanupOldHomework(supabase, user.id);

    const { error } = await supabase
      .from('homework')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ message: 'Homework deleted' }, { status: 200 });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
