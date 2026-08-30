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
  Heart,
  Share2,
  Smartphone,
} from 'lucide-react';

const FEATURES = [
  { Icon: CalendarDays, label: 'Stundenplan', color: 'text-blue-300', glow: 'hover:shadow-blue-500/20' },
  { Icon: BookOpen, label: 'Hausaufgaben', color: 'text-purple-300', glow: 'hover:shadow-purple-500/20' },
  { Icon: BarChart3, label: 'Noten', color: 'text-pink-300', glow: 'hover:shadow-pink-500/20' },
  { Icon: Bell, label: 'Benachrichtigungen', color: 'text-cyan-300', glow: 'hover:shadow-cyan-500/20' },
];

const STEPS = [
  { Icon: Smartphone, title: 'In Safari öffnen', text: 'Öffne diese Seite in Safari auf deinem iPhone oder iPad.' },
  { Icon: Share2, title: 'Teilen antippen', text: 'Nutze unten in Safari das Teilen-Symbol.' },
  { Icon: Download, title: 'Zum Home-Bildschirm', text: 'Wähle die Option „Zum Home-Bildschirm“ aus.' },
  { Icon: CheckCircle2, title: 'App direkt nutzen', text: 'Bestätigen – StudentOS erscheint als App auf deinem Home-Bildschirm.' },
];

function Reveal({
  show,
  delay = 0,
  className = '',
  children,
}: {
  show: boolean;
  delay?: number;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className={`transition-all duration-700 ease-out will-change-[opacity,transform] ${
        show ? 'opacity-100 translate-y-0 blur-0' : 'opacity-0 translate-y-6 blur-[2px]'
      } ${className}`}
      style={{ transitionDelay: `${delay}ms` }}
    >
      {children}
    </div>
  );
}

export default function Home() {
  const [visible, setVisible] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as unknown as { standalone?: boolean }).standalone === true;

    if (isStandalone) {
      router.push('/login');
      return;
    }
    const id = requestAnimationFrame(() => setVisible(true));
    return () => cancelAnimationFrame(id);
  }, [router]);

  return (
    <div
      className="h-[100dvh] bg-gradient-to-b from-[#0a0a0a] via-[#121212] to-[#1a1a1a] text-white overflow-y-auto overflow-x-hidden"
      style={{ willChange: 'scroll-position' }}
    >
      <AuthBackground />

      <div className="pointer-events-none absolute inset-x-0 top-0 flex justify-center overflow-hidden">
        <div className="landing-glow mt-[-6rem] h-[32rem] w-[32rem] rounded-full bg-[radial-gradient(circle,rgba(99,102,241,0.28),rgba(236,72,153,0.12)_45%,transparent_70%)] blur-2xl" />
      </div>

      <div className="relative z-10 min-h-screen flex flex-col items-center justify-center px-6 py-16">
        <div className="max-w-5xl mx-auto text-center space-y-8">
          <Reveal show={visible} delay={0} className="flex justify-center">
            <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3.5 py-1.5 text-xs text-gray-300 backdrop-blur-sm">
              <Heart className="w-3.5 h-3.5 text-pink-400" />
              Privates Projekt – nur für Freunde &amp; Familie
            </span>
          </Reveal>

          <Reveal show={visible} delay={90} className="flex items-center justify-center">
            <div className="landing-float relative">
              <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-blue-500/40 to-pink-500/40 blur-xl" />
              <div className="relative w-16 h-16 rounded-2xl bg-white/10 border border-white/20 flex items-center justify-center backdrop-blur-sm">
                <AppWindow className="w-8 h-8 text-white" />
              </div>
            </div>
          </Reveal>

          <Reveal show={visible} delay={150}>
            <h1 className="text-5xl md:text-7xl font-bold bg-[length:200%_auto] gradient-animate bg-gradient-to-r from-blue-400 via-fuchsia-400 to-pink-400 bg-clip-text text-transparent">
              StudentOS
            </h1>
            <p className="text-lg md:text-2xl text-gray-300 mt-4">Dein digitaler Schulalltag in einer App</p>
          </Reveal>

          <Reveal show={visible} delay={230}>
            <p className="text-base md:text-lg text-gray-400 max-w-3xl mx-auto">
              Stundenplan, Hausaufgaben, Noten und Termine – klar strukturiert, schnell erreichbar und
              optimiert für die Nutzung als App auf deinem Smartphone.
            </p>
            <p className="text-sm text-yellow-300/90 max-w-3xl mx-auto mt-3">
              Hinweis: Push-Benachrichtigungen sind noch in Entwicklung.
            </p>
          </Reveal>

          <Reveal show={visible} delay={310} className="flex items-center justify-center">
            <a
              href="/login"
              className="group inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-white/10 hover:bg-white/15 border border-white/20 text-white font-semibold transition-all hover:scale-[1.03] active:scale-95 hover:shadow-lg hover:shadow-fuchsia-500/20"
            >
              Jetzt starten
              <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
            </a>
          </Reveal>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 max-w-4xl mx-auto">
            {FEATURES.map(({ Icon, label, color, glow }, i) => (
              <Reveal key={label} show={visible} delay={380 + i * 70}>
                <div
                  className={`group h-full p-4 rounded-xl bg-white/5 border border-white/10 flex flex-col items-center gap-2 transition-all duration-300 hover:-translate-y-1 hover:bg-white/10 hover:border-white/20 shadow-lg shadow-transparent ${glow}`}
                >
                  <Icon className={`w-6 h-6 ${color} transition-transform duration-300 group-hover:scale-110`} />
                  <p className="text-xs md:text-sm text-gray-300">{label}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>

        <Reveal show={visible} delay={720} className="max-w-4xl w-full mx-auto mt-16">
          <div className="bg-white/5 border border-white/10 rounded-2xl p-6 md:p-8 backdrop-blur-sm">
            <h2 className="text-2xl md:text-3xl font-semibold text-center mb-3">Installation auf iOS</h2>
            <p className="text-gray-400 text-center mb-8 text-sm md:text-base">
              Installiere StudentOS auf deinem iPhone oder iPad für eine native App-Erfahrung.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-5">
              {STEPS.map(({ Icon, title, text }, i) => (
                <div
                  key={title}
                  className="group relative p-4 rounded-xl bg-white/5 border border-white/10 flex gap-3 items-start transition-all duration-300 hover:bg-white/10 hover:border-white/20"
                >
                  <span className="absolute -top-2 -left-2 w-6 h-6 rounded-full bg-white/10 border border-white/20 text-[11px] font-semibold flex items-center justify-center text-gray-300">
                    {i + 1}
                  </span>
                  <Icon className="w-5 h-5 text-blue-300 mt-0.5 transition-transform duration-300 group-hover:scale-110" />
                  <div>
                    <h3 className="font-semibold text-white">{title}</h3>
                    <p className="text-sm text-gray-400 mt-1">{text}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-6 p-4 rounded-xl bg-white/5 border border-white/10 text-center">
              <p className="text-sm text-gray-300">
                Als installierte App startet StudentOS schneller und fühlt sich wie eine native App an.
              </p>
            </div>
          </div>
        </Reveal>

        <Reveal
          show={visible}
          delay={820}
          className="mt-16 text-center text-gray-500 text-sm flex flex-wrap items-center justify-center gap-3"
        >
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
            Datenschutz &amp; Hinweise
          </a>
        </Reveal>
      </div>
    </div>
  );
}
