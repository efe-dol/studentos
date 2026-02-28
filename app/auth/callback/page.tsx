'use client';

import { createClient } from '@/utils/supabase/client';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

export default function AuthCallback() {
  const router = useRouter();
  const [status, setStatus] = useState('Authentifizierung läuft...');

  useEffect(() => {
    const handleCallback = async () => {
      try {
        const supabase = createClient();

        // Middleware hat bereits PKCE in Cookies gespeichert
        // Verarbeite einfach den Token aus der URL
        const { data, error } = await supabase.auth.exchangeCodeForSession(
          window.location.search
        );

        if (error) {
          console.error('Auth callback error:', error);
          setStatus('❌ Fehler: ' + error.message);
          setTimeout(() => router.push('/login'), 3000);
          return;
        }

        if (data?.session) {
          setStatus('✅ Verifizierung erfolgreich!');
          await new Promise(r => setTimeout(r, 1000));
          router.push('/dashboard');
        } else {
          setStatus('❌ Keine Session erstellt');
          setTimeout(() => router.push('/login'), 3000);
        }
      } catch (err: any) {
        console.error('Callback error:', err);
        setStatus('❌ ' + (err?.message || 'Unbekannter Fehler'));
        setTimeout(() => router.push('/login'), 3000);
      }
    };

    handleCallback();
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-[#0a0a0a] via-[#121212] to-[#1a1a1a]">
      <div className="text-center">
        <p className="text-white mb-4">{status}</p>
        <div className="inline-block animate-spin">
          <div className="w-8 h-8 border-4 border-white/20 border-t-white rounded-full"></div>
        </div>
      </div>
    </div>
  );
}
