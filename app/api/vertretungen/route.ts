import { NextRequest, NextResponse } from 'next/server';
import { getElternportalCredentials } from '@/utils/encryption';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export async function GET(request: NextRequest) {
  try {
    // Hole User-ID aus Session
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
    
    console.log('Fetching from Go Backend:', goBackendUrl);
    console.log('User ID:', user.id);
    
    try {
      const response = await fetch(`${goBackendUrl}/api/vertretungen`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: credentials.email,
          password: credentials.password,
        }),
      });

      console.log('Go Backend Response status:', response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Go Backend error:', errorText);
        throw new Error(`Go Backend returned ${response.status}: ${errorText}`);
      }

      const vertretungen = await response.json();
      console.log('Successfully fetched vertretungen:', vertretungen);
      return NextResponse.json(vertretungen);
    } catch (goError) {
      console.error('Go Backend Error:', goError);
      console.error('Go Backend URL was:', goBackendUrl);
      
      // Fallback: Mock-Daten wenn Backend nicht erreichbar
      const mockVertretungen = {
        heute: {
          motd: `Backend nicht erreichbar: ${goError instanceof Error ? goError.message : 'Unbekannter Fehler'}`,
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
