'use client';
import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import AuthBackground from '@/app/components/common/AuthBackground';
import Toast from '@/app/components/common/Toast';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
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
      setToast({ message: error.message, type: 'error' });
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

        {/* Divider with OR */}
        <div className="flex items-center my-6 gap-4">
          <div className="flex-1 border-t border-white/10"></div>
          <span className="text-sm text-gray-500">ODER</span>
          <div className="flex-1 border-t border-white/10"></div>
        </div>

        {/* Register Button */}
        <div className="mt-4">
          <a
            href="/register"
            className="w-full py-3 rounded-xl border border-white/20 text-gray-300 hover:text-white hover:bg-white/5 font-medium transition-all duration-200 flex items-center justify-center"
          >
            Neuen Account erstellen
          </a>
        </div>
      </form>
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
