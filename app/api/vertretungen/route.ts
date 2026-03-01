import { NextRequest, NextResponse } from 'next/server';
import { getElternportalCredentials } from '@/utils/encryption';
import { createServerClient } from '@supabase/ssr';

export async function GET(request: NextRequest) {
  try {
    // Hole User-ID aus Session
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll();
          },
          setAll() {},
        },
      }
    );

    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Hole Elternportal-Credentials
    const credentials = await getElternportalCredentials(user.id);
    
    if (!credentials.email || !credentials.password) {
      return NextResponse.json({ 
        error: 'Elternportal-Zugangsdaten nicht konfiguriert' 
      }, { status: 400 });
    }

    // TODO: Hier würde der Go-Backend-Call stattfinden
    // Beispiel:
    // const response = await fetch('http://localhost:3001/api/vertretungen', {
    //   method: 'POST',
    //   headers: { 'Content-Type': 'application/json' },
    //   body: JSON.stringify({
    //     email: credentials.email,
    //     password: credentials.password,
    //   }),
    // });

    // Placeholder-Response
    const mockVertretungen = {
      heute: {
        motd: 'Keine Änderungen',
        vertretungen: [],
      },
      morgen: {
        motd: 'Vertretungsplan verfügbar',
        vertretungen: [
          {
            stunde: '3',
            betrifft: '10a',
            vertretung: 'Mw',
            fach: 'Mathematik',
            raum: '302',
            info: 'Raumänderung',
          },
        ],
      },
      stand: '01.03.2026 08:30',
    };

    return NextResponse.json(mockVertretungen);
  } catch (error) {
    console.error('Vertretungen API Error:', error);
    return NextResponse.json(
      { error: 'Fehler beim Abrufen der Vertretungen' },
      { status: 500 }
    );
  }
}
