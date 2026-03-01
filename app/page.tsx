'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import AuthBackground from '@/app/components/AuthBackground';

export default function Home() {
  const [visible, setVisible] = useState(false);
  const router = useRouter();

  useEffect(() => {
    // Check if running as installed PWA/native app
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || 
                        (window.navigator as any).standalone === true;
    
    if (isStandalone) {
      // Redirect to login if app is installed
      router.push('/login');
    } else {
      setVisible(true);
    }
  }, [router]);

  return (
    <div className="min-h-screen h-screen bg-gradient-to-b from-[#0a0a0a] via-[#121212] to-[#1a1a1a] text-white overflow-y-auto overflow-x-hidden" style={{ willChange: 'scroll-position' }}>
      <AuthBackground />

      {/* Hero Section */}
      <div className="relative z-10 min-h-screen flex flex-col items-center justify-center px-6 py-20">
        <div
          className={`max-w-4xl mx-auto text-center space-y-8 transition-opacity duration-300 ease-out ${
            visible ? 'opacity-100' : 'opacity-0'
          }`}
          style={{ willChange: 'opacity' }}
        >
          {/* Logo/Title */}
          <div className="space-y-4">
            <h1 className="text-6xl md:text-7xl font-bold bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
              StudentOS
            </h1>
            <p className="text-xl md:text-2xl text-gray-300">
              by Efe Dolaman
            </p>
          </div>

          {/* Description */}
          <p className="text-lg text-gray-400 max-w-2xl mx-auto">
            Deine zentrale Plattform für Stundenplan, Hausaufgaben, Noten und mehr.
            Installiere die App auf deinem iPhone oder iPad für den besten Zugang.
          </p>
        </div>

        {/* Installation Guide */}
        <div
          className={`max-w-3xl mx-auto mt-20 transition-opacity duration-300 ease-out ${
            visible ? 'opacity-100' : 'opacity-0'
          }`}
          style={{ willChange: 'opacity' }}
        >
          <div className="bg-white/5 border border-white/10 rounded-2xl p-8">
            <h2 className="text-3xl font-semibold mb-6 text-center">
              📱 App Installation (Safari/iOS)
            </h2>
            <p className="text-gray-400 text-center mb-8">
              Installiere StudentOS auf deinem iPhone oder iPad für eine native App-Erfahrung
            </p>

            <div className="space-y-6">
              {/* Step 1 */}
              <div className="flex gap-4 p-4 rounded-xl bg-white/5 active:bg-white/10 transition-colors">
                <div className="flex-shrink-0 w-10 h-10 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 flex items-center justify-center font-bold text-lg">
                  1
                </div>
                <div>
                  <h3 className="font-semibold text-lg mb-2">
                    Safari öffnen
                  </h3>
                  <p className="text-gray-400 text-sm">
                    Öffne diese Webseite in <strong>Safari</strong> auf deinem iPhone oder iPad
                  </p>
                </div>
              </div>

              {/* Step 2 */}
              <div className="flex gap-4 p-4 rounded-xl bg-white/5 active:bg-white/10 transition-colors">
                <div className="flex-shrink-0 w-10 h-10 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 flex items-center justify-center font-bold text-lg">
                  2
                </div>
                <div>
                  <h3 className="font-semibold text-lg mb-2">
                    Teilen-Button tippen
                  </h3>
                  <p className="text-gray-400 text-sm">
                    Tippe unten auf das <strong>Teilen-Symbol</strong> (Viereck mit Pfeil nach oben) 
                    in der Safari-Leiste
                  </p>
                </div>
              </div>

              {/* Step 3 */}
              <div className="flex gap-4 p-4 rounded-xl bg-white/5 active:bg-white/10 transition-colors">
                <div className="flex-shrink-0 w-10 h-10 rounded-full bg-gradient-to-r from-pink-500 to-red-500 flex items-center justify-center font-bold text-lg">
                  3
                </div>
                <div>
                  <h3 className="font-semibold text-lg mb-2">
                    Zum Home-Bildschirm
                  </h3>
                  <p className="text-gray-400 text-sm">
                    Scrolle im Menü nach unten und wähle{' '}
                    <strong>"Zum Home-Bildschirm"</strong> aus
                  </p>
                </div>
              </div>

              {/* Step 4 */}
              <div className="flex gap-4 p-4 rounded-xl bg-white/5 active:bg-white/10 transition-colors">
                <div className="flex-shrink-0 w-10 h-10 rounded-full bg-gradient-to-r from-green-500 to-emerald-500 flex items-center justify-center font-bold text-lg">
                  4
                </div>
                <div>
                  <h3 className="font-semibold text-lg mb-2">
                    Fertig!
                  </h3>
                  <p className="text-gray-400 text-sm">
                    Bestätige mit <strong>"Hinzufügen"</strong>. Die App erscheint jetzt auf deinem Home-Bildschirm
                  </p>
                </div>
              </div>
            </div>

            {/* Additional Info */}
            <div className="mt-8 p-4 rounded-xl bg-blue-500/10 border border-blue-500/20">
              <p className="text-sm text-blue-300 text-center">
                💡 <strong>Tipp:</strong> Die installierte App funktioniert wie eine native App 
                und bietet schnellen Zugriff auf alle Funktionen.
              </p>
            </div>
          </div>
        </div>

        {/* Features Preview */}
        <div
          className={`max-w-5xl mx-auto mt-20 transition-opacity duration-300 ease-out ${
            visible ? 'opacity-100' : 'opacity-0'
          }`}
          style={{ willChange: 'opacity' }}
        >
          <h2 className="text-3xl font-semibold mb-10 text-center">
            ✨ Features
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Feature 1 */}
            <div className="bg-white/5 border border-white/10 rounded-2xl p-6 active:bg-white/10 transition-colors">
              <div className="text-4xl mb-4">📚</div>
              <h3 className="text-xl font-semibold mb-2">Stundenplan</h3>
              <p className="text-gray-400 text-sm">
                Immer den aktuellen Stundenplan dabei
              </p>
            </div>

            {/* Feature 2 */}
            <div className="bg-white/5 border border-white/10 rounded-2xl p-6 active:bg-white/10 transition-colors">
              <div className="text-4xl mb-4">✏️</div>
              <h3 className="text-xl font-semibold mb-2">Hausaufgaben</h3>
              <p className="text-gray-400 text-sm">
                Alle Aufgaben an einem Ort verwalten
              </p>
            </div>

            {/* Feature 3 */}
            <div className="bg-white/5 border border-white/10 rounded-2xl p-6 active:bg-white/10 transition-colors">
              <div className="text-4xl mb-4">📊</div>
              <h3 className="text-xl font-semibold mb-2">Noten</h3>
              <p className="text-gray-400 text-sm">
                Überblick über deine Leistungen
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-20 text-center text-gray-500 text-sm">
          <p>© {new Date().getFullYear()} StudentOS by Efe Dolaman</p>
        </div>
      </div>
    </div>
  );
}
