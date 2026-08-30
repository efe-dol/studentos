'use client';
import { Suspense, useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter, useSearchParams } from 'next/navigation';
import AuthBackground from '@/app/components/common/AuthBackground';
import Toast from '@/app/components/common/Toast';

function LoginContent() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [maintenanceMode, setMaintenanceMode] = useState(false);
  const [blockedMessageVisible, setBlockedMessageVisible] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const supabase = createClient();
  const router = useRouter();
  const searchParams = useSearchParams();
  const blockedByAdmin = searchParams.get('blocked') === '1';
  const redirectedForMaintenance = searchParams.get('maintenance') === '1';
  const showBlockedMessage = blockedByAdmin || blockedMessageVisible;

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

  const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setToast({ message: error.message, type: 'error' });
      setLoading(false);
      return;
    }

    const {
      data: { user },
    } = await supabase.auth.getUser();

    const { data: profileData, error: profileError } = await supabase
      .from('profiles')
      .select('role, is_blocked')
      .eq('id', user?.id)
      .single();

    let profile = profileData as { role?: 'user' | 'admin'; is_blocked?: boolean } | null;

    if (profileError && String(profileError.message || '').toLowerCase().includes('is_blocked')) {
      const { data: fallbackProfile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user?.id)
        .single();

      profile = {
        role: fallbackProfile?.role,
        is_blocked: false,
      };
    }

    if (profile?.is_blocked) {
      await supabase.auth.signOut();
      setBlockedMessageVisible(true);
      setLoading(false);
      return;
    }

    if (maintenanceMode && profile?.role !== 'admin') {
      await supabase.auth.signOut();
      setToast({ message: 'Wartungsmodus aktiv. Nur Admins können sich einloggen.', type: 'error' });
      setLoading(false);
      return;
    }

    setLoading(false);
    router.push('/dashboard');
  };

  return (
    <div className="min-h-screen relative overflow-hidden flex flex-col">
      <AuthBackground />
      
      {/* Header */}
      <div className="relative z-10 border-b border-white/10 backdrop-blur-xl bg-white/5">
        <div className="w-full px-6 py-4">
          <h2 className="text-white text-xl font-semibold">StudentOS</h2>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-10">
        {/* Title Section - Outside the form */}
        <div className="w-full max-w-xl mb-8 text-center animate-[slideUpSmooth_0.5s_cubic-bezier(0.16,1,0.3,1)]">
          <h1 className="text-3xl font-bold text-white mb-3">
            Anmelden
          </h1>
          <p className="text-gray-400 text-base">
            Melde dich an, um auf StudentOS zuzugreifen
          </p>
        </div>

        {maintenanceMode && (
          <div className="w-full max-w-xl mb-6 rounded-xl border border-red-500/40 bg-red-500/15 p-4 text-red-200 animate-[fadeIn_0.35s_ease-out]">
            <p className="font-semibold">Wartungsmodus aktiv</p>
            <p className="text-sm text-red-100/90 mt-1">Aktuell können sich nur Administratoren einloggen.</p>
          </div>
        )}

        {(showBlockedMessage || redirectedForMaintenance) && (
          <div className="w-full max-w-xl mb-6 rounded-xl border border-red-500/40 bg-red-500/15 p-4 text-red-200 animate-[fadeIn_0.35s_ease-out]">
            <p className="font-semibold">Zugriff eingeschränkt</p>
            <p className="text-sm text-red-100/90 mt-1">
              {showBlockedMessage
                ? 'Dein Konto wurde gesperrt. Kontaktiere einen Administrator.'
                : 'Wartungsmodus aktiv. Login aktuell nur für Administratoren möglich.'}
            </p>
          </div>
        )}

        {/* Form Box */}
        <form
          onSubmit={handleLogin}
          className="relative z-10 w-full max-w-xl p-10 rounded-2xl backdrop-blur-xl bg-white/5 border border-white/10 shadow-2xl animate-[slideUpSmooth_0.6s_cubic-bezier(0.16,1,0.3,1)_0.1s] opacity-0 [animation-fill-mode:forwards]"
        >

        <div className="grid grid-cols-1 gap-4">
          <div className="field">
            <input
              className="focus-glow px-4 py-3 rounded-xl text-white placeholder-transparent"
              type="email"
              placeholder=" "
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              disabled={loading}
            />
            <label>E‑Mail</label>
          </div>

          <div className="field">
            <input
              className="focus-glow px-4 py-3 rounded-xl text-white placeholder-transparent"
              type="password"
              placeholder=" "
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              disabled={loading}
            />
            <label>Passwort</label>
          </div>
        </div>

        <div className="mt-6">
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 text-white font-semibold shadow-lg hover:scale-[1.01] active:scale-95 transition-all duration-200 backdrop-blur-sm disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Anmeldung läuft...' : 'Anmelden'}
          </button>
        </div>

        {/* Register – im Wartungsmodus ausgeblendet, da Registrierung gesperrt ist */}
        {!maintenanceMode && (
          <>
            <div className="flex items-center my-6 gap-4">
              <div className="flex-1 border-t border-white/10"></div>
              <span className="text-sm text-gray-500">ODER</span>
              <div className="flex-1 border-t border-white/10"></div>
            </div>

            <div className="mt-4">
              <a
                href="/register"
                className="w-full py-3 rounded-xl border border-white/20 text-gray-300 hover:text-white hover:bg-white/5 font-medium transition-all duration-200 flex items-center justify-center"
              >
                Neuen Account erstellen
              </a>
            </div>
          </>
        )}
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

      {/* Toast Notification */}
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
    </div>
  );
}

export default function Login() {
  return (
    <Suspense fallback={null}>
      <LoginContent />
    </Suspense>
  );
}
