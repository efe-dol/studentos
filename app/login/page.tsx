'use client';
import { useState } from 'react';
import { createClient } from '@/utils/supabase/client';
import { useRouter } from 'next/navigation';
import AuthBackground from '@/app/components/AuthBackground';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const supabase = createClient();
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      alert(error.message);
      setLoading(false);
      return;
    }

    setLoading(false);
    router.push('/dashboard');
  };

  return (
    <div className="min-h-screen relative overflow-hidden flex items-center justify-center">
      <AuthBackground />
      <form
        onSubmit={handleLogin}
        className="relative z-10 w-full max-w-xl p-10 rounded-2xl backdrop-blur-xl bg-white/5 border border-white/10 shadow-2xl animate-[slideUpSmooth_0.6s_cubic-bezier(0.16,1,0.3,1)]"
      >
        <div className="mb-6 text-center">
          <h1 className="text-white text-3xl font-semibold">Anmelden</h1>
          <p className="text-gray-300 text-sm mt-1">Melde dich an, um auf StudentOS zuzugreifen</p>
        </div>

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

        <div className="mt-4 text-center">
          <p className="text-gray-400 text-sm">
            Hast du noch keinen Account?{' '}
            <a href="/register" className="text-white/70 hover:text-white transition-colors">
              Hier registrieren
            </a>
          </p>
        </div>
      </form>

      <div className="absolute bottom-6 left-0 right-0 text-center">
        <p className="text-gray-500 text-xs">© 2026 StudentOS by Efe Dolaman</p>
      </div>
    </div>
  );
}
