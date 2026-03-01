import { NextRequest, NextResponse } from 'next/server';
import { getElternportalCredentials } from '@/utils/encryption';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

interface Vertretung {
  stunde: string;
  betrifft: string;
  vertretung: string;
  fach: string;
  raum: string;
  info: string;
}

interface Vertretungsplan {
  motd: string;
  vertretungen: Vertretung[];
}

interface Response {
  heute: Vertretungsplan;
  morgen: Vertretungsplan;
  stand: string;
}

function cleanHTML(text: string): string {
  // Remove HTML tags
  text = text.replace(/<[^>]*>/g, '');
  // Replace HTML entities
  text = text.replace(/&nbsp;/g, ' ');
  text = text.replace(/&lt;/g, '<');
  text = text.replace(/&gt;/g, '>');
  text = text.replace(/&amp;/g, '&');
  return text.trim();
}

async function scrapeVertretungsplan(email: string, password: string): Promise<Response> {
  const jar = new Map<string, string>();
  
  // Step 1: Get CSRF token from login page
  console.log('Step 1: Getting CSRF token...');
  const loginPageRes = await fetch('https://weilgym.eltern-portal.org/', {
    method: 'GET',
    headers: {
      'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Mobile/15E148 Safari/604.1',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
    },
  });

  const loginPageHtml = await loginPageRes.text();
  
  // Extract CSRF token
  const csrfMatch = loginPageHtml.match(/csrf['"]?\s+value=['"]([^'"]+)['"]/);
  if (!csrfMatch || !csrfMatch[1]) {
    throw new Error('CSRF token not found');
  }
  const csrfToken = csrfMatch[1];
  console.log('CSRF Token extracted:', csrfToken);

  // Extract cookies from Set-Cookie header
  const setCookieHeaders = loginPageRes.headers.getSetCookie?.() || [];
  setCookieHeaders.forEach(cookie => {
    const [cookiePair] = cookie.split(';');
    const [name, value] = cookiePair.split('=');
    if (name && value) jar.set(name, value);
  });

  // Step 2: Login with credentials
  console.log('Step 2: Logging in...');
  const loginPayload = new URLSearchParams({
    csrf: csrfToken,
    username: email,
    password: password,
    go_to: '',
  });

  const loginRes = await fetch('https://weilgym.eltern-portal.org/includes/project/auth/login.php', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Mobile/15E148 Safari/604.1',
      'Origin': 'https://weilgym.eltern-portal.org',
      'Referer': 'https://weilgym.eltern-portal.org/',
      'Cookie': Array.from(jar.entries()).map(([k, v]) => `${k}=${v}`).join('; '),
    },
    body: loginPayload.toString(),
  });

  // Extract cookies from login response
  const loginSetCookies = loginRes.headers.getSetCookie?.() || [];
  loginSetCookies.forEach(cookie => {
    const [cookiePair] = cookie.split(';');
    const [name, value] = cookiePair.split('=');
    if (name && value) jar.set(name, value);
  });

  console.log('Login successful, status:', loginRes.status);

  // Step 3: Fetch Vertretungsplan
  console.log('Step 3: Fetching Vertretungsplan...');
  const vpRes = await fetch('https://weilgym.eltern-portal.org/service/vertretungsplan', {
    method: 'GET',
    headers: {
      'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Mobile/15E148 Safari/604.1',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
      'Referer': 'https://weilgym.eltern-portal.org/start',
      'Cookie': Array.from(jar.entries()).map(([k, v]) => `${k}=${v}`).join('; '),
    },
  });

  const vpHtml = await vpRes.text();
  console.log('VP HTML length:', vpHtml.length);

  const plan: Response = {
    heute: { motd: '', vertretungen: [] },
    morgen: { motd: '', vertretungen: [] },
    stand: '',
  };

  // Parse MOTD
  const motdRegex = /<p[^>]*class=['"]pull-left['"][^>]*>([^<]+(?:<br[^>]*>[^<]*)*)<\/p>/g;
  const motds = [...vpHtml.matchAll(motdRegex)];
  console.log('Found MOTDs:', motds.length);
  
  if (motds.length > 0) {
    let motdText = motds[0][1];
    motdText = motdText.replace(/<br[^>]*>/g, ' ').replace(/&nbsp;/g, ' ').trim();
    plan.heute.motd = motdText;
    console.log('Today MOTD:', plan.heute.motd);
  }
  
  if (motds.length > 1) {
    let motdText = motds[1][1];
    motdText = motdText.replace(/<br[^>]*>/g, ' ').replace(/&nbsp;/g, ' ').trim();
    plan.morgen.motd = motdText;
    console.log('Tomorrow MOTD:', plan.morgen.motd);
  }

  // Parse tables
  const tableRegex = /<table[^>]*class=['"]table['"][^>]*>(.*?)<\/table>/gs;
  const tables = [...vpHtml.matchAll(tableRegex)];
  console.log('Found tables:', tables.length);

  tables.forEach((tableMatch, tableIdx) => {
    const tableContent = tableMatch[1];
    
    // Parse rows
    const rowRegex = /<tr[^>]*>(.*?)<\/tr>/gs;
    const rows = [...tableContent.matchAll(rowRegex)];
    console.log(`Table ${tableIdx}: Found ${rows.length} rows`);

    const vertretungen: Vertretung[] = [];

    rows.forEach((rowMatch, rowIdx) => {
      if (rowIdx === 0) return; // Skip header
      
      const rowContent = rowMatch[1];
      const cellRegex = /<td[^>]*>([^<]*(?:<[^>]*>[^<]*)*?)<\/td>/g;
      const cells = [...rowContent.matchAll(cellRegex)];
      
      if (cells.length < 6) {
        console.log(`Table ${tableIdx} Row ${rowIdx}: Only ${cells.length} cells`);
        return;
      }

      const v: Vertretung = {
        stunde: cleanHTML(cells[0][1]),
        betrifft: cleanHTML(cells[1][1]),
        vertretung: cleanHTML(cells[2][1]),
        fach: cleanHTML(cells[3][1]),
        raum: cleanHTML(cells[4][1]),
        info: cleanHTML(cells[5][1]),
      };

      if (v.stunde && v.stunde !== 'Std.') {
        vertretungen.push(v);
        console.log('Added vertretung:', v);
      }
    });

    if (tableIdx === 0) {
      plan.heute.vertretungen = vertretungen;
    } else if (tableIdx === 1) {
      plan.morgen.vertretungen = vertretungen;
    }
  });

  // Parse Stand
  const standMatch = vpHtml.match(/Stand:[\s&;a-z]*(\d{1,2}\.\d{1,2}\.\d{4}[\s&;a-z]*\d{1,2}:\d{2}:\d{2})/);
  if (standMatch) {
    plan.stand = standMatch[1].replace(/&nbsp;/g, ' ').trim();
    console.log('Stand found:', plan.stand);
  }

  return plan;
}

function filterByClass(plan: Response, className: string): Response {
  const classNameLower = className.toLowerCase();
  
  const filtered: Response = {
    heute: {
      motd: plan.heute.motd,
      vertretungen: plan.heute.vertretungen.filter(
        v => v.betrifft.toLowerCase() === classNameLower || 
             v.betrifft.toLowerCase().includes(classNameLower)
      ),
    },
    morgen: {
      motd: plan.morgen.motd,
      vertretungen: plan.morgen.vertretungen.filter(
        v => v.betrifft.toLowerCase() === classNameLower || 
             v.betrifft.toLowerCase().includes(classNameLower)
      ),
    },
    stand: plan.stand,
  };

  console.log(`Filtered for ${className}: ${filtered.heute.vertretungen.length} heute, ${filtered.morgen.vertretungen.length} morgen`);
  return filtered;
}

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

    // Hole Nutzer-Klasse aus Profil
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('class_name')
      .eq('id', user.id)
      .single();

    if (profileError || !profile?.class_name) {
      return NextResponse.json({ 
        error: 'Klasse nicht im Profil eingetragen' 
      }, { status: 400 });
    }

    console.log('User class:', profile.class_name);

    // Hole Elternportal-Credentials
    const credentials = await getElternportalCredentials(user.id);
    
    if (!credentials.email || !credentials.password) {
      return NextResponse.json({ 
        error: 'Elternportal-Zugangsdaten nicht konfiguriert' 
      }, { status: 400 });
    }

    console.log('Scraping vertretungsplan for:', credentials.email);

    try {
      // Scrape directly instead of calling Go backend
      const vertretungen = await scrapeVertretungsplan(credentials.email, credentials.password);
      
      // Filter by class
      const filtered = filterByClass(vertretungen, profile.class_name);
      
      console.log('Successfully scraped and filtered vertretungen');
      return NextResponse.json(filtered);
    } catch (scrapeError) {
      console.error('Scraping error:', scrapeError);
      
      // Fallback: Error message
      return NextResponse.json({
        heute: {
          motd: `Fehler beim Abrufen: ${scrapeError instanceof Error ? scrapeError.message : 'Unbekannter Fehler'}`,
          vertretungen: [],
        },
        morgen: {
          motd: 'Bitte versuche es später erneut',
          vertretungen: [],
        },
        stand: new Date().toLocaleString('de-DE'),
      });
    }
  } catch (err) {
    console.error('API error:', err);
    return NextResponse.json({ 
      error: err instanceof Error ? err.message : 'Unknown error' 
    }, { status: 500 });
  }
}
