'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import AuthBackground from '@/app/components/common/AuthBackground';
import {
  AppWindow,
  ArrowRight,
  BarChart3,
  Bell,
  BookOpen,
  CalendarDays,
  CheckCircle2,
  Download,
  Share2,
  Smartphone,
} from 'lucide-react';

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
    <div className="h-[100dvh] bg-gradient-to-b from-[#0a0a0a] via-[#121212] to-[#1a1a1a] text-white overflow-y-auto overflow-x-hidden" style={{ willChange: 'scroll-position' }}>
      <AuthBackground />

      {/* Hero Section */}
      <div className="relative z-10 min-h-screen flex flex-col items-center justify-center px-6 py-16">
        <div
          className={`max-w-5xl mx-auto text-center space-y-8 transition-all duration-400 ease-out ${
            visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
          }`}
          style={{ willChange: 'opacity, transform' }}
        >
          <div className="flex items-center justify-center mb-2">
            <div className="w-16 h-16 rounded-2xl bg-white/10 border border-white/20 flex items-center justify-center">
              <AppWindow className="w-8 h-8 text-white" />
            </div>
          </div>

          <div className="space-y-4">
            <h1 className="text-5xl md:text-7xl font-bold bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
              StudentOS
            </h1>
            <p className="text-lg md:text-2xl text-gray-300">
              Dein digitaler Schulalltag in einer App
            </p>
          </div>

          <p className="text-base md:text-lg text-gray-400 max-w-3xl mx-auto">
            Stundenplan, Hausaufgaben, Noten, Termine und Benachrichtigungen – klar strukturiert,
            schnell erreichbar und optimiert für die Nutzung als App auf deinem Smartphone.
          </p>
          <p className="text-sm text-yellow-300 max-w-3xl mx-auto">
            Hinweis: Benachrichtigungen funktionieren aktuell noch nicht. Diese Funktion ist in Entwicklung.
          </p>

          <div className="flex items-center justify-center">
            <a
              href="/login"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-white/10 hover:bg-white/15 border border-white/20 text-white font-semibold transition-all hover:scale-[1.02]"
            >
              Jetzt starten
              <ArrowRight className="w-4 h-4" />
            </a>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 max-w-4xl mx-auto">
            <div className="p-4 rounded-xl bg-white/5 border border-white/10 flex flex-col items-center gap-2">
              <CalendarDays className="w-6 h-6 text-blue-300" />
              <p className="text-xs md:text-sm text-gray-300">Stundenplan</p>
            </div>
            <div className="p-4 rounded-xl bg-white/5 border border-white/10 flex flex-col items-center gap-2">
              <BookOpen className="w-6 h-6 text-purple-300" />
              <p className="text-xs md:text-sm text-gray-300">Hausaufgaben</p>
            </div>
            <div className="p-4 rounded-xl bg-white/5 border border-white/10 flex flex-col items-center gap-2">
              <BarChart3 className="w-6 h-6 text-pink-300" />
              <p className="text-xs md:text-sm text-gray-300">Noten</p>
            </div>
            <div className="p-4 rounded-xl bg-white/5 border border-white/10 flex flex-col items-center gap-2">
              <Bell className="w-6 h-6 text-cyan-300" />
              <p className="text-xs md:text-sm text-gray-300">Benachrichtigungen (in Entwicklung)</p>
            </div>
          </div>
        </div>

        <div
          className={`max-w-4xl w-full mx-auto mt-14 transition-all duration-400 delay-75 ease-out ${
            visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
          }`}
          style={{ willChange: 'opacity, transform' }}
        >
          <div className="bg-white/5 border border-white/10 rounded-2xl p-6 md:p-8">
            <h2 className="text-2xl md:text-3xl font-semibold text-center mb-3">Installation auf iOS</h2>
            <p className="text-gray-400 text-center mb-8 text-sm md:text-base">
              Installiere StudentOS auf deinem iPhone oder iPad für eine native App-Erfahrung.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-5">
              <div className="p-4 rounded-xl bg-white/5 border border-white/10 flex gap-3 items-start">
                <Smartphone className="w-5 h-5 text-blue-300 mt-0.5" />
                <div>
                  <h3 className="font-semibold text-white">In Safari öffnen</h3>
                  <p className="text-sm text-gray-400 mt-1">Öffne diese Seite in Safari auf deinem iPhone oder iPad.</p>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-white/5 border border-white/10 flex gap-3 items-start">
                <Share2 className="w-5 h-5 text-purple-300 mt-0.5" />
                <div>
                  <h3 className="font-semibold text-white">Teilen antippen</h3>
                  <p className="text-sm text-gray-400 mt-1">Nutze unten in Safari das Teilen-Symbol.</p>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-white/5 border border-white/10 flex gap-3 items-start">
                <Download className="w-5 h-5 text-pink-300 mt-0.5" />
                <div>
                  <h3 className="font-semibold text-white">Zum Home-Bildschirm</h3>
                  <p className="text-sm text-gray-400 mt-1">Wähle die Option „Zum Home-Bildschirm“ aus.</p>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-white/5 border border-white/10 flex gap-3 items-start">
                <CheckCircle2 className="w-5 h-5 text-emerald-300 mt-0.5" />
                <div>
                  <h3 className="font-semibold text-white">App direkt nutzen</h3>
                  <p className="text-sm text-gray-400 mt-1">Bestätigen – StudentOS erscheint als App auf deinem Home-Bildschirm.</p>
                </div>
              </div>
            </div>

            <div className="mt-6 p-4 rounded-xl bg-white/5 border border-white/10 text-center">
              <p className="text-sm text-gray-300">Als installierte App startet StudentOS schneller und fühlt sich wie eine native App an.</p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-16 text-center text-gray-500 text-sm flex flex-wrap items-center justify-center gap-3">
          <p>Copyright {new Date().getFullYear()} StudentOS by Efe Dolaman</p>
          <span className="text-gray-600">•</span>
          <a
            href="/impressum"
            className="text-xs font-bold bg-gradient-to-r from-blue-300 via-purple-300 to-pink-300 bg-clip-text text-transparent underline underline-offset-4"
          >
            Impressum
          </a>
          <a
            href="/privacy"
            className="text-xs font-bold bg-gradient-to-r from-blue-300 via-purple-300 to-pink-300 bg-clip-text text-transparent underline underline-offset-4"
          >
            Datenschutz & Hinweise
          </a>
        </div>
      </div>
    </div>
  );
}
