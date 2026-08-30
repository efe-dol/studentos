import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

export const PASSWORD_MIN_LENGTH = 8;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Kept in sync with the client-side checklist in the register page.
export const passwordProblem = (pw: unknown): string | null => {
  if (typeof pw !== 'string') return 'Ungültiges Passwort.';
  if (pw.length < PASSWORD_MIN_LENGTH) return `Passwort muss mindestens ${PASSWORD_MIN_LENGTH} Zeichen haben.`;
  if (pw.length > 72) return 'Passwort ist zu lang (maximal 72 Zeichen).';
  if (!/[a-z]/.test(pw)) return 'Passwort braucht mindestens einen Kleinbuchstaben.';
  if (!/[A-Z]/.test(pw)) return 'Passwort braucht mindestens einen Großbuchstaben.';
  if (!/[0-9]/.test(pw)) return 'Passwort braucht mindestens eine Ziffer.';
  return null;
};

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => null);

    const email = String(body?.email ?? '').trim().toLowerCase();
    const emailConfirm = String(body?.emailConfirm ?? '').trim().toLowerCase();
    const password = body?.password;
    const firstName = String(body?.firstName ?? '').trim();
    const lastName = String(body?.lastName ?? '').trim();
    const className = String(body?.className ?? '').trim();

    if (!EMAIL_RE.test(email) || email.length > 254) {
      return NextResponse.json({ error: 'Bitte eine gültige E-Mail-Adresse eingeben.' }, { status: 400 });
    }
    if (email !== emailConfirm) {
      return NextResponse.json({ error: 'Die E-Mail-Adressen stimmen nicht überein.' }, { status: 400 });
    }
    if (!firstName || !lastName || !className) {
      return NextResponse.json({ error: 'Bitte Vorname, Nachname und Klasse angeben.' }, { status: 400 });
    }
    if (firstName.length > 80 || lastName.length > 80 || className.length > 40) {
      return NextResponse.json({ error: 'Eine Eingabe ist zu lang.' }, { status: 400 });
    }

    const pwProblem = passwordProblem(password);
    if (pwProblem) {
      return NextResponse.json({ error: pwProblem }, { status: 400 });
    }

    const supabase = await createClient();

    // Registrierung im Wartungsmodus serverseitig sperren.
    const { data: settings } = await supabase
      .from('app_settings')
      .select('maintenance_mode')
      .eq('id', true)
      .single();

    if (settings?.maintenance_mode) {
      return NextResponse.json(
        { error: 'Die Registrierung ist im Wartungsmodus gesperrt.' },
        { status: 503 }
      );
    }

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          first_name: firstName.slice(0, 80),
          last_name: lastName.slice(0, 80),
          class_name: className.slice(0, 40),
        },
      },
    });

    if (error) {
      // Generic message – do not echo Supabase auth internals.
      return NextResponse.json(
        { error: 'Registrierung fehlgeschlagen. Bitte prüfe deine Angaben oder versuche es später erneut.' },
        { status: 400 }
      );
    }

    return NextResponse.json({ ok: true }, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
