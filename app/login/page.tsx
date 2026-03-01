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
    <div className="min-h-screen relative overflow-hidden flex flex-col">
      <AuthBackground />
      
      {/* Header */}
      <div className="relative z-10 border-b border-white/10 backdrop-blur-xl bg-white/5">
        <div className="max-w-xl mx-auto px-6 py-4">
          <h2 className="text-white text-xl font-semibold">StudentOS</h2>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-10">
        {/* Title Section - Outside the form */}
        <div className="w-full max-w-xl mb-8 text-center animate-[slideUpSmooth_0.5s_cubic-bezier(0.16,1,0.3,1)]">
          <h1 className="text-5xl font-bold bg-gradient-to-b from-white via-white to-white/40 bg-clip-text text-transparent mb-3">
            Anmelden
          </h1>
          <p className="text-gray-400 text-lg">
            Melde dich an, um auf StudentOS zuzugreifen
          </p>
        </div>

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

        <div className="mt-4 text-center">
          <p className="text-gray-400 text-sm">
            Hast du noch keinen Account?{' '}
            <a href="/register" className="text-white/70 hover:text-white transition-colors">
              Hier registrieren
            </a>
          </p>
        </div>
      </form>
      </div>
    </div>
  );
}
