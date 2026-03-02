'use client';

import AuthBackground from '@/app/components/common/AuthBackground';
import { ArrowLeft, Building2 } from 'lucide-react';
import Link from 'next/link';

export default function ImpressumPage() {
  const today = new Date().toLocaleDateString('de-DE');

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
            <h1 className="text-3xl sm:text-4xl font-bold">Impressum</h1>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto overflow-x-hidden pt-6 pb-8">
          <div className="space-y-6 card-stagger-3">
            <section className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-2xl p-6 sm:p-8 content-fade-in">
              <h2 className="text-xl sm:text-2xl font-semibold mb-4 flex items-center gap-2">
                <Building2 className="w-5 h-5" />
                Angaben gemäß § 5 DDG
              </h2>
              <p className="text-gray-300 leading-relaxed text-sm sm:text-base">
                StudentOS
                <br />
                StudentOS ist ein privates, nicht-kommerzielles Projekt von Efe Dolaman, das ohne Gewinnerzielungsabsicht betrieben wird.
              </p>
              <p className="text-gray-300 leading-relaxed text-sm sm:text-base mt-4">
                weitere Informationen befinden sich auf der{' '}
                <Link
                  href="/privacy"
                  className="font-bold bg-gradient-to-r from-blue-300 via-purple-300 to-pink-300 bg-clip-text text-transparent underline underline-offset-4"
                >
                  Datenschutz & Hinweise
                </Link>{' '}
                Seite.
              </p>
            </section>

            <section className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-2xl p-6 sm:p-8 content-fade-in">
              <h2 className="text-xl sm:text-2xl font-semibold mb-4">Vertreten durch</h2>
              <p className="text-gray-300 leading-relaxed text-sm sm:text-base">
                Efe Dolaman
              </p>
              <p className="text-gray-300 leading-relaxed text-sm sm:text-base">
                (Adresse zum Schutz der betroffenen Person nicht öffentlich angegeben)
              </p>
            </section>

            <section className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-2xl p-6 sm:p-8 content-fade-in">
              <h2 className="text-xl sm:text-2xl font-semibold mb-4">Kontakt</h2>
              <p className="text-gray-300 leading-relaxed text-sm sm:text-base">
                <span className="font-bold">T</span>{' '}
                <a
                  href="tel:+491718389261"
                  className="font-bold bg-gradient-to-r from-blue-300 via-purple-300 to-pink-300 bg-clip-text text-transparent underline underline-offset-4"
                >
                  +49 (0) 171 8389261
                </a>
                <br />
                <span className="font-bold">E</span>{' '}
                <a
                  href="mailto:efedolaman@gmail.com"
                  className="font-bold bg-gradient-to-r from-blue-300 via-purple-300 to-pink-300 bg-clip-text text-transparent underline underline-offset-4"
                >
                  efedolaman@gmail.com
                </a>
                <br />
                <span className="font-bold">W</span>{' '}
                <a
                  href="https://student-os.tech"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-bold bg-gradient-to-r from-blue-300 via-purple-300 to-pink-300 bg-clip-text text-transparent underline underline-offset-4"
                >
                  student-os.tech
                </a>
              </p>
            </section>

            <section className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-2xl p-6 sm:p-8 content-fade-in">
              <h2 className="text-xl sm:text-2xl font-semibold mb-4">Technische Umsetzung</h2>
              <p className="text-gray-300 leading-relaxed text-sm sm:text-base">
                Efe Dolaman
              </p>
            </section>

            <section className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-2xl p-6 sm:p-8 content-fade-in">
              <h2 className="text-xl sm:text-2xl font-semibold mb-4">EU-Streitschlichtung</h2>
              <p className="text-gray-300 leading-relaxed text-sm sm:text-base">
                Wir nehmen nicht an Streitbeilegungsverfahren vor einer Verbraucherschlichtungsstelle teil und sind dazu auch nicht verpflichtet.
              </p>
            </section>

            <section className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-2xl p-6 sm:p-8 content-fade-in">
              <h2 className="text-xl sm:text-2xl font-semibold mb-4">Haftungsausschluss:</h2>
              <h3 className="text-lg sm:text-xl font-semibold mb-3">Haftung für Inhalte</h3>
              <p className="text-gray-300 leading-relaxed text-sm sm:text-base">
                Die Inhalte unserer Seiten wurden mit größter Sorgfalt erstellt. Für die Richtigkeit, Vollständigkeit und Aktualität der Inhalte können wir jedoch keine Gewähr übernehmen. Als Diensteanbieter sind wir gemäß § 7 Abs.1 DDG für eigene Inhalte auf diesen Seiten nach den allgemeinen Gesetzen verantwortlich. Nach §§ 8 bis 10 DDG sind wir als Diensteanbieter jedoch nicht verpflichtet, übermittelte oder gespeicherte fremde Informationen zu überwachen oder nach Umständen zu forschen, die auf eine rechtswidrige Tätigkeit hinweisen. Verpflichtungen zur Entfernung oder Sperrung der Nutzung von Informationen nach den allgemeinen Gesetzen bleiben hiervon unberührt. Eine diesbezügliche Haftung ist jedoch erst ab dem Zeitpunkt der Kenntnis einer konkreten Rechtsverletzung möglich. Bei Bekanntwerden von entsprechenden Rechtsverletzungen werden wir diese Inhalte umgehend entfernen.
              </p>

              <h3 className="text-lg sm:text-xl font-semibold mt-6 mb-3">Haftung für Links</h3>
              <p className="text-gray-300 leading-relaxed text-sm sm:text-base">
                Unser Angebot enthält Links zu externen Webseiten Dritter, auf deren Inhalte wir keinen Einfluss haben. Deshalb können wir für diese fremden Inhalte auch keine Gewähr übernehmen. Für die Inhalte der verlinkten Seiten ist stets der jeweilige Anbieter oder Betreiber der Seiten verantwortlich. Die verlinkten Seiten wurden zum Zeitpunkt der Verlinkung auf mögliche Rechtsverstöße überprüft. Rechtswidrige Inhalte waren zum Zeitpunkt der Verlinkung nicht erkennbar. Eine permanente inhaltliche Kontrolle der verlinkten Seiten ist jedoch ohne konkrete Anhaltspunkte einer Rechtsverletzung nicht zumutbar. Bei Bekanntwerden von Rechtsverletzungen werden wir derartige Links umgehend entfernen.
              </p>

              <h3 className="text-lg sm:text-xl font-semibold mt-6 mb-3">Urheberrecht</h3>
              <p className="text-gray-300 leading-relaxed text-sm sm:text-base">
                Die durch die Seitenbetreiber erstellten Inhalte und Werke auf diesen Seiten unterliegen dem deutschen Urheberrecht. Die Vervielfältigung, Bearbeitung, Verbreitung und jede Art der Verwertung außerhalb der Grenzen des Urheberrechtes bedürfen der schriftlichen Zustimmung des jeweiligen Autors bzw. Erstellers. Downloads und Kopien dieser Seite sind nur für den privaten, nicht kommerziellen Gebrauch gestattet. Soweit die Inhalte auf dieser Seite nicht vom Betreiber erstellt wurden, werden die Urheberrechte Dritter beachtet. Insbesondere werden Inhalte Dritter als solche gekennzeichnet. Sollten Sie trotzdem auf eine Urheberrechtsverletzung aufmerksam werden, bitten wir um einen entsprechenden Hinweis. Bei Bekanntwerden von Rechtsverletzungen werden wir derartige Inhalte umgehend entfernen.
              </p>

              <p className="text-xs text-gray-400 mt-6">Zuletzt aktuallisiert: {today}</p>
              <p className="text-xs text-gray-500 mt-2">Copyright {new Date().getFullYear()} StudentOS by Efe Dolaman</p>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}