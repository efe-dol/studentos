import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export async function GET(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options);
            });
          },
        },
      }
    );

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      return NextResponse.json({
        status: 'error',
        message: 'Nicht authentifiziert',
        error: userError?.message,
      }, { status: 401 });
    }

    // Prüfe, ob Profil existiert
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    // Prüfe Tabellen-Schema
    const { data: schema, error: schemaError } = await supabase
      .from('profiles')
      .select('*')
      .limit(0);

    return NextResponse.json({
      status: 'debug',
      user: {
        id: user.id,
        email: user.email,
      },
      profile: {
        exists: profile ? 'ja' : 'nein',
        data: profile,
        error: profileError?.message,
      },
      schema: {
        error: schemaError?.message,
      },
      environment: {
        hasEncryptionKey: !!process.env.CREDENTIALS_ENCRYPTION_KEY,
        encryptionKeyLength: process.env.CREDENTIALS_ENCRYPTION_KEY?.length || 0,
      },
    });
  } catch (error) {
    console.error('Debug error:', error);
    return NextResponse.json(
      { error: String(error) },
      { status: 500 }
    );
  }
}
