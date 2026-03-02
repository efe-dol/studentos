'use client';

import AuthBackground from '@/app/components/common/AuthBackground';
import { ArrowLeft, Shield } from 'lucide-react';
import Link from 'next/link';

export default function PrivacyPage() {
  return (
    <div className="fixed inset-0 bg-gradient-to-b from-[#0a0a0a] via-[#121212] to-[#1a1a1a] text-white flex flex-col overflow-hidden">
      <AuthBackground />

      <div className="relative z-10 flex-1 max-w-4xl w-full mx-auto px-6 pt-6 pb-24 flex flex-col overflow-hidden">
        <div className="sticky top-0 z-30 backdrop-blur-xl bg-[#0d0d0d]/70 rounded-b-2xl pb-5">
          <div className="flex items-center gap-4 mb-5 card-stagger-1 pt-2">
            <Link
              href="/settings"
              className="p-2 rounded-lg hover:bg-white/10 transition-all border border-white/10 hover:scale-105"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <h1 className="text-3xl sm:text-4xl font-bold">Datenschutz & Hinweise</h1>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto overflow-x-hidden pt-6 pb-8">
          <div className="space-y-6 card-stagger-3">
            <section className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-2xl p-6 sm:p-8 content-fade-in">
              <h2 className="text-xl sm:text-2xl font-semibold mb-4 flex items-center gap-2">
                <Shield className="w-5 h-5" />
                Einleitung & Verantwortlicher
              </h2>
              <p className="text-gray-300 leading-relaxed text-sm sm:text-base">
                Diese App ist ein rein privates Projekt für den engen Freundes- und Familienkreis. Eine gewerbliche Nutzung ist ausgeschlossen.
                Die Nutzung erfolgt auf eigene Verantwortung.
              </p>
              <p className="text-gray-300 leading-relaxed text-sm sm:text-base mt-4">
                Verantwortlicher: Efe Dolaman, efedolaman@gmail.com (Adresse zum Schutz der betroffenen Person nicht öffentlich angegeben).
              </p>
            </section>

            <section className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-2xl p-6 sm:p-8 content-fade-in">
              <h2 className="text-xl sm:text-2xl font-semibold mb-4">Erhebung und Speicherung personenbezogener Daten</h2>
              <div className="space-y-4 text-sm sm:text-base text-gray-300 leading-relaxed">
                <p>
                  Für den technischen Betrieb werden Dienste von Vercel Inc. (Hosting), GitHub, Inc. (Code-Management und Deployment)
                  sowie Supabase Inc. (Backend, Datenbank und Authentifizierung) verwendet.
                </p>
                <p>
                  Beim Aufruf der App verarbeitet Vercel Server-Logfiles (insbesondere IP-Adresse, User-Agent, Zeitstempel,
                  angeforderte Ressource sowie Browser-/Systeminformationen), um Stabilität und Sicherheit des Betriebs sicherzustellen.
                </p>
                <p>
                  Für dein Benutzerkonto verarbeitet Supabase insbesondere E-Mail-Adresse, Authentifizierungsdaten (Passwörter ausschließlich
                  gehasht/verschlüsselt) sowie Session-/Authentifizierungs-Cookies für Login und Zugriffsschutz.
                </p>
                <p>
                  Je nach Nutzung werden zusätzlich folgende Datenkategorien verarbeitet: Profildaten (Name, Klasse, Geburtstag, Schule,
                  Rolle), schulische Daten (Hausaufgaben, Noten, Fächer inkl. Farben/Räumen/Lehrkraft, Stundenplan, Termine, To-Dos),
                  Push-Benachrichtigungsdaten (Endpoint/Schlüssel p256dh/auth), Share-Token für die Teilen-Funktion sowie technische
                  Schutz- und Betriebsdaten (z. B. Rate-Limiting-Metadaten).
                </p>
                <p>
                  Technische Schutzmaßnahmen verarbeiten zudem Verbindungs-Metadaten wie IP-basierte Request-Zählungen
                  (Rate-Limiting im laufenden Serverprozess) und Sicherheitsheader (z. B. Autorisierungsheader für interne Cron-Prozesse).
                </p>
              </div>
            </section>

            <section className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-2xl p-6 sm:p-8 content-fade-in">
              <h2 className="text-xl sm:text-2xl font-semibold mb-4">Zweck der Verarbeitung</h2>
              <p className="text-gray-300 leading-relaxed text-sm sm:text-base">
                Die Verarbeitung erfolgt ausschließlich zur Bereitstellung und technischen Absicherung der App-Funktionen (Anmeldung,
                Datenspeicherung, Synchronisierung, Benachrichtigungen, Fehleranalyse und Betriebssicherheit).
              </p>
              <p className="text-gray-300 leading-relaxed text-sm sm:text-base mt-4">
                Rechtsgrundlagen sind Art. 6 Abs. 1 lit. b DSGVO (Bereitstellung der App-Funktionen) und Art. 6 Abs. 1 lit. f DSGVO
                (berechtigtes Interesse an Betriebssicherheit, Missbrauchsschutz und technischer Stabilität).
              </p>
              <p className="text-gray-300 leading-relaxed text-sm sm:text-base mt-4">
                Eine automatisierte Entscheidungsfindung mit rechtlicher Wirkung oder Profiling im Sinne von Art. 22 DSGVO findet nicht statt.
              </p>
            </section>

            <section className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-2xl p-6 sm:p-8 content-fade-in">
              <h2 className="text-xl sm:text-2xl font-semibold mb-4">Dauer der Speicherung</h2>
              <p className="text-gray-300 leading-relaxed text-sm sm:text-base">
                Deine Daten werden nur so lange gespeichert, wie dein Account aktiv ist. Mit der Löschung deines Accounts werden
                personenbezogene Daten in Supabase grundsätzlich gelöscht (inklusive zugehöriger Datensätze, soweit technisch verknüpft).
              </p>
            </section>

            <section className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-2xl p-6 sm:p-8 content-fade-in">
              <h2 className="text-xl sm:text-2xl font-semibold mb-4">Drittstaaten-Transfer</h2>
              <p className="text-gray-300 leading-relaxed text-sm sm:text-base">
                Da Vercel und Supabase US-Unternehmen sind, kann eine Verarbeitung in Drittländern (insbesondere USA) stattfinden.
                Für den Datentransfer werden geeignete Garantien genutzt, insbesondere Standardvertragsklauseln (SCC) bzw. das EU-US Data Privacy Framework,
                soweit anwendbar.
              </p>
            </section>

            <section className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-2xl p-6 sm:p-8 content-fade-in">
              <h2 className="text-xl sm:text-2xl font-semibold mb-4">Betroffenenrechte</h2>
              <p className="text-gray-300 leading-relaxed text-sm sm:text-base">
                Du hast im Rahmen der gesetzlichen Vorgaben insbesondere das Recht auf Auskunft über gespeicherte personenbezogene Daten
                sowie auf Löschung. Anfragen kannst du an efedolaman@gmail.com richten.
              </p>
              <p className="text-gray-300 leading-relaxed text-sm sm:text-base mt-4">
                Zusätzlich bestehen – soweit einschlägig – Rechte auf Berichtigung, Einschränkung der Verarbeitung und Datenübertragbarkeit.
              </p>
            </section>

            <section className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-2xl p-6 sm:p-8 content-fade-in">
              <h2 className="text-xl sm:text-2xl font-semibold mb-4">Haftungsausschluss (private Nutzung)</h2>
              <p className="text-gray-300 leading-relaxed text-sm sm:text-base">
                StudentOS ist ein rein privates Projekt für Freunde und Familie; eine gewerbliche Nutzung ist ausgeschlossen.
                Die Nutzung erfolgt auf eigene Gefahr. Es wird keine Gewähr für Verfügbarkeit, Aktualität, Vollständigkeit oder
                Eignung für bestimmte Zwecke übernommen; eine Haftung für Datenverlust oder Funktionsfehler wird, soweit gesetzlich
                zulässig, ausgeschlossen.
              </p>
              <p className="text-xs text-gray-400 mt-4">Stand: 02.03.2026</p>
              <p className="text-xs text-gray-500 mt-2">Copyright {new Date().getFullYear()} StudentOS by Efe Dolaman</p>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}