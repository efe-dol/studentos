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

    // Rufe Go-Backend auf
    const goBackendUrl = process.env.GO_BACKEND_URL || 'http://localhost:8000';
    
    try {
      const response = await fetch(`${goBackendUrl}/api/vertretungen`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: credentials.email,
          password: credentials.password,
        }),
      });

      if (!response.ok) {
        throw new Error(`Go Backend returned ${response.status}`);
      }

      const vertretungen = await response.json();
      return NextResponse.json(vertretungen);
    } catch (goError) {
      console.error('Go Backend Error:', goError);
      
      // Fallback: Mock-Daten wenn Backend nicht erreichbar
      const mockVertretungen = {
        heute: {
          motd: 'Backend nicht erreichbar - Mock-Daten',
          vertretungen: [],
        },
        morgen: {
          motd: 'Bitte Go-Backend starten',
          vertretungen: [],
        },
        stand: new Date().toLocaleString('de-DE'),
      };

      return NextResponse.json(mockVertretungen);
    }
  } catch (error) {
    console.error('Vertretungen API Error:', error);
    return NextResponse.json(
      { error: 'Fehler beim Abrufen der Vertretungen' },
      { status: 500 }
    );
  }
}
