'use client';
import { useState, useEffect } from 'react';
import { RefreshCw, AlertCircle } from 'lucide-react';

interface Vertretung {
  stunde: string;
  betrifft: string;
  vertretung: string;
  fach: string;
  raum: string;
  info: string;
}

interface Vertretungsplan {
  motd: string;
  vertretungen: Vertretung[];
}

interface VertretungsData {
  heute: Vertretungsplan;
  morgen: Vertretungsplan;
  stand: string;
}

export function SubstitutionsView({ onSettingsClick }: { onSettingsClick: () => void }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<VertretungsData | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const fetchVertretungen = async () => {
    setRefreshing(true);
    try {
      const response = await fetch('/api/vertretungen');
      if (!response.ok) {
        throw new Error('Zugangsdaten nicht konfiguriert');
      }
      const result = await response.json();
      setData(result);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Fehler beim Abrufen');
      setData(null);
    } finally {
      setRefreshing(false);
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVertretungen();
  }, []);

  if (loading) {
    return (
      <div className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-2xl p-8 text-center content-fade-in">
        <p className="text-gray-400">Lädt...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-2xl p-8 content-fade-in">
        <div className="flex flex-col items-center gap-4">
          <AlertCircle className="w-12 h-12 text-orange-400" />
          <div className="text-center">
            <h3 className="text-white font-semibold mb-2">Zugangsdaten erforderlich</h3>
            <p className="text-gray-400 mb-4">{error}</p>
            <button
              onClick={onSettingsClick}
              className="px-4 py-2 rounded-lg bg-purple-500 hover:bg-purple-600 text-white font-medium transition-all"
            >
              Einstellungen öffnen
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 content-fade-in">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-semibold text-white mb-1">Vertretungsplan</h2>
          <p className="text-gray-400 text-sm">Stand: {data?.stand}</p>
        </div>
        <button
          onClick={fetchVertretungen}
          disabled={refreshing}
          className="p-2 rounded-lg hover:bg-white/10 transition-all border border-white/10 disabled:opacity-50"
        >
          <RefreshCw className={`w-5 h-5 ${refreshing ? 'animate-spin' : ''}`} />
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Heute */}
        <div className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-2xl p-6 card-stagger-1">
          <h3 className="text-xl font-semibold text-white mb-2">Heute</h3>
          <p className="text-gray-400 text-sm mb-4">{data?.heute.motd}</p>
          
          {data?.heute.vertretungen && data.heute.vertretungen.length > 0 ? (
            <div className="space-y-3">
              {data.heute.vertretungen.map((v, i) => (
                <div key={i} className="p-3 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 transition-all">
                  <div className="flex justify-between mb-2">
                    <span className="font-medium text-white">{v.stunde}. Stunde</span>
                    <span className="text-sm text-gray-400">{v.fach}</span>
                  </div>
                  <p className="text-sm text-gray-300">Klasse: <span className="font-semibold">{v.betrifft}</span></p>
                  <p className="text-sm text-gray-300">Vertretung: <span className="font-semibold">{v.vertretung}</span></p>
                  {v.raum && <p className="text-sm text-gray-400">Raum: {v.raum}</p>}
                  {v.info && <p className="text-sm text-orange-400 mt-1">ℹ️ {v.info}</p>}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-400 text-sm">Keine Vertretungen</p>
          )}
        </div>

        {/* Morgen */}
        <div className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-2xl p-6 card-stagger-2">
          <h3 className="text-xl font-semibold text-white mb-2">Morgen</h3>
          <p className="text-gray-400 text-sm mb-4">{data?.morgen.motd}</p>
          
          {data?.morgen.vertretungen && data.morgen.vertretungen.length > 0 ? (
            <div className="space-y-3">
              {data.morgen.vertretungen.map((v, i) => (
                <div key={i} className="p-3 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 transition-all">
                  <div className="flex justify-between mb-2">
                    <span className="font-medium text-white">{v.stunde}. Stunde</span>
                    <span className="text-sm text-gray-400">{v.fach}</span>
                  </div>
                  <p className="text-sm text-gray-300">Klasse: <span className="font-semibold">{v.betrifft}</span></p>
                  <p className="text-sm text-gray-300">Vertretung: <span className="font-semibold">{v.vertretung}</span></p>
                  {v.raum && <p className="text-sm text-gray-400">Raum: {v.raum}</p>}
                  {v.info && <p className="text-sm text-orange-400 mt-1">ℹ️ {v.info}</p>}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-400 text-sm">Keine Vertretungen</p>
          )}
        </div>
      </div>
    </div>
  );
}
