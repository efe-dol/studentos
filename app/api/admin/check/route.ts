import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ isAdmin: false }, { status: 200 });
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    return NextResponse.json({ isAdmin: profile?.role === 'admin' }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ isAdmin: false }, { status: 200 });
  }
}
