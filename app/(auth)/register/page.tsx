'use client';
import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Check, X as XIcon } from 'lucide-react';
import AuthBackground from '@/app/components/common/AuthBackground';
import Toast from '@/app/components/common/Toast';

const PASSWORD_MIN_LENGTH = 8;

export default function Register() {
  const [email, setEmail] = useState('');
  const [emailConfirm, setEmailConfirm] = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [className, setClassName] = useState('');
  const [maintenanceMode, setMaintenanceMode] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const router = useRouter();

  useEffect(() => {
    const loadMaintenanceMode = async () => {
      try {
        const response = await fetch('/api/maintenance-mode');
        if (!response.ok) return;
        const data = await response.json();
        setMaintenanceMode(Boolean(data.maintenanceMode));
      } catch {
        setMaintenanceMode(false);
      }
    };
    loadMaintenanceMode();
  }, []);

  const pwChecks = useMemo(
    () => ({
      length: password.length >= PASSWORD_MIN_LENGTH,
      lower: /[a-z]/.test(password),
      upper: /[A-Z]/.test(password),
      digit: /[0-9]/.test(password),
    }),
    [password]
  );
  const pwValid = pwChecks.length && pwChecks.lower && pwChecks.upper && pwChecks.digit;
  const emailsMatch = email.length > 0 && email.trim().toLowerCase() === emailConfirm.trim().toLowerCase();
  const canSubmit =
    !maintenanceMode &&
    !submitting &&
    Boolean(email && firstName && lastName && className) &&
    emailsMatch &&
    pwValid;

  const handleSignUp = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (maintenanceMode) {
      setToast({ message: 'Registrierung ist im Wartungsmodus gesperrt.', type: 'error' });
      return;
    }
    if (!email || !firstName || !lastName || !className) {
      setToast({ message: 'Bitte alle Felder ausfüllen.', type: 'error' });
      return;
    }
    if (!emailsMatch) {
      setToast({ message: 'Die E-Mail-Adressen stimmen nicht überein.', type: 'error' });
      return;
    }
    if (!pwValid) {
      setToast({ message: 'Das Passwort erfüllt die Mindestanforderungen nicht.', type: 'error' });
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email.trim(),
          emailConfirm: emailConfirm.trim(),
          password,
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          className: className.trim(),
        }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data.error || 'Registrierung fehlgeschlagen.');
      }
      setToast({
        message: 'Registrierung erfolgreich! Bitte bestätige den Link in deiner E-Mail.',
        type: 'success',
      });
      setTimeout(() => router.push('/login'), 2200);
    } catch (error: unknown) {
      setToast({
        message: error instanceof Error ? error.message : 'Unbekannter Fehler.',
        type: 'error',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const Rule = ({ ok, children }: { ok: boolean; children: React.ReactNode }) => (
    <li className={`flex items-center gap-2 ${ok ? 'text-emerald-300' : 'text-gray-400'}`}>
      {ok ? <Check className="w-3.5 h-3.5" /> : <XIcon className="w-3.5 h-3.5" />}
      {children}
    </li>
  );

  return (
    <div className="min-h-screen relative overflow-hidden flex flex-col">
      <AuthBackground />

      <div className="relative z-10 border-b border-white/10 backdrop-blur-xl bg-white/5">
        <div className="w-full px-6 py-4">
          <h2 className="text-white text-xl font-semibold">StudentOS</h2>
        </div>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center px-6 py-10">
        <div className="w-full max-w-xl mb-8 text-center animate-[slideUpSmooth_0.5s_cubic-bezier(0.16,1,0.3,1)]">
          <h1 className="text-3xl font-bold text-white mb-3">Account erstellen</h1>
          <p className="text-gray-400 text-base">Erstelle einen Account, um mit StudentOS zu starten</p>
        </div>

        {maintenanceMode && (
          <div className="w-full max-w-xl mb-6 rounded-xl border border-red-500/40 bg-red-500/15 p-4 text-red-200 animate-[fadeIn_0.35s_ease-out]">
            <p className="font-semibold">Wartungsmodus aktiv</p>
            <p className="text-sm text-red-100/90 mt-1">Die Registrierung ist aktuell gesperrt.</p>
          </div>
        )}

        <form
          onSubmit={handleSignUp}
          className="relative z-10 w-full max-w-xl p-10 rounded-2xl backdrop-blur-xl bg-white/5 border border-white/10 shadow-2xl animate-[slideUpSmooth_0.6s_cubic-bezier(0.16,1,0.3,1)_0.1s] opacity-0 [animation-fill-mode:forwards]"
        >
          <div className="grid grid-cols-1 gap-4">
            <div className="field">
              <input
                className="focus-glow px-4 py-3 rounded-xl text-white placeholder-transparent"
                type="email"
                placeholder=" "
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                required
              />
              <label>E‑Mail</label>
            </div>

            <div className="field">
              <input
                className="focus-glow px-4 py-3 rounded-xl text-white placeholder-transparent"
                type="email"
                placeholder=" "
                value={emailConfirm}
                onChange={(e) => setEmailConfirm(e.target.value)}
                onPaste={(e) => e.preventDefault()}
                autoComplete="off"
                required
              />
              <label>E‑Mail wiederholen</label>
              {emailConfirm.length > 0 && !emailsMatch && (
                <p className="text-xs text-red-300 mt-1">Die E-Mail-Adressen stimmen nicht überein.</p>
              )}
            </div>

            <div className="field">
              <input
                className="focus-glow px-4 py-3 rounded-xl text-white placeholder-transparent"
                type="password"
                placeholder=" "
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="new-password"
                required
              />
              <label>Passwort</label>
            </div>

            <ul className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs -mt-1">
              <Rule ok={pwChecks.length}>Mind. {PASSWORD_MIN_LENGTH} Zeichen</Rule>
              <Rule ok={pwChecks.upper}>Großbuchstabe</Rule>
              <Rule ok={pwChecks.lower}>Kleinbuchstabe</Rule>
              <Rule ok={pwChecks.digit}>Ziffer</Rule>
            </ul>

            <div className="grid grid-cols-2 gap-4">
              <div className="field">
                <input
                  className="focus-glow px-4 py-3 rounded-xl text-white placeholder-transparent"
                  type="text"
                  placeholder=" "
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  autoComplete="given-name"
                  required
                />
                <label>Vorname</label>
              </div>

              <div className="field">
                <input
                  className="focus-glow px-4 py-3 rounded-xl text-white placeholder-transparent"
                  type="text"
                  placeholder=" "
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  autoComplete="family-name"
                  required
                />
                <label>Nachname</label>
              </div>
            </div>

            <div className="field">
              <input
                className="focus-glow px-4 py-3 rounded-xl text-white placeholder-transparent"
                type="text"
                placeholder=" "
                value={className}
                onChange={(e) => setClassName(e.target.value)}
                required
              />
              <label>Klasse (z.B. 9c)</label>
            </div>
          </div>

          <div className="mt-6">
            <button
              type="submit"
              disabled={!canSubmit}
              className="w-full py-3 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 text-white font-semibold shadow-lg hover:scale-[1.01] active:scale-95 transition-all duration-200 backdrop-blur-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? 'Wird erstellt…' : 'Registrieren'}
            </button>
          </div>

          <div className="flex items-center my-6 gap-4">
            <div className="flex-1 border-t border-white/10"></div>
            <span className="text-sm text-gray-500">ODER</span>
            <div className="flex-1 border-t border-white/10"></div>
          </div>

          <div className="mt-4">
            <a
              href="/login"
              className="w-full py-3 rounded-xl border border-white/20 text-gray-300 hover:text-white hover:bg-white/5 font-medium transition-all duration-200 flex items-center justify-center"
            >
              Bereits registriert? Anmelden
            </a>
          </div>
        </form>
      </div>

      <div className="relative z-10 px-6 pb-6 text-center space-y-2 animate-[fadeIn_0.35s_ease-out]">
        <div className="flex items-center justify-center gap-4">
          <a
            href="/impressum"
            className="text-xs font-semibold text-gray-300 hover:text-white underline underline-offset-4"
          >
            Impressum
          </a>
          <a
            href="/privacy"
            className="text-xs font-semibold text-gray-300 hover:text-white underline underline-offset-4"
          >
            Datenschutz & Hinweise
          </a>
        </div>
        <p className="text-xs text-gray-500">Copyright {new Date().getFullYear()} StudentOS by Efe Dolaman</p>
      </div>

      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
}
