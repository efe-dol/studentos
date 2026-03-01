'use client';

import { useState } from 'react';
import { X, BookOpen } from 'lucide-react';

interface AddSubjectDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (name: string, type: 'HAUPTFACH' | 'NEBENFACH', color: string) => Promise<void>;
  isLoading?: boolean;
}

const COLOR_PRESETS = [
  // Reds
  '#ef4444', '#f87171', '#fca5a5',
  // Oranges
  '#f97316', '#fb923c', '#fbbd23',
  // Yellows
  '#eab308', '#facc15', '#fde047',
  // Greens
  '#22c55e', '#4ade80', '#86efac',
  // Teals
  '#14b8a6', '#2dd4bf', '#67e8f9',
  // Blues
  '#3b82f6', '#60a5fa', '#93c5fd',
  // Indigo
  '#6366f1', '#818cf8', '#a5b4fc',
  // Purples
  '#8b5cf6', '#a78bfa', '#ddd6fe',
  // Pinks
  '#ec4899', '#f472b6', '#fbcfe8',
];

export default function AddSubjectDialog({
  isOpen,
  onClose,
  onAdd,
  isLoading = false,
}: AddSubjectDialogProps) {
  const [name, setName] = useState('');
  const [type, setType] = useState<'HAUPTFACH' | 'NEBENFACH'>('HAUPTFACH');
  const [color, setColor] = useState(COLOR_PRESETS[0]);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!name.trim()) {
      setError('Fächername ist erforderlich');
      return;
    }

    try {
      await onAdd(name, type, color);
      setName('');
      setType('HAUPTFACH');
      setColor(COLOR_PRESETS[0]);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Fehler beim Hinzufügen des Fachs');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
      <div className="bg-gradient-to-br from-[#1a1a1a] to-[#0d0d0d] rounded-2xl shadow-2xl p-6 max-w-md w-full border border-white/5 max-h-[90vh] overflow-y-auto animate-in fade-in zoom-in-95 scale-100 duration-300">
        {/* Header */}
        <div className="flex items-center justify-between mb-6 gap-3 animate-in fade-in slide-in-from-top-4 duration-300">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <div className="p-2 bg-gradient-to-br from-blue-500/20 to-purple-500/20 rounded-lg flex-shrink-0 animate-in zoom-in-75 duration-300 delay-100">
              <BookOpen className="w-5 h-5 text-blue-400" />
            </div>
            <h2 className="text-lg sm:text-xl font-bold text-white truncate animate-in fade-in slide-in-from-left-4 duration-300 delay-100">Fach hinzufügen</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/10 rounded-lg transition-colors flex-shrink-0 hover:scale-110 duration-200"
          >
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Name Input */}
          <div className="animate-in fade-in slide-in-from-left-4 duration-300 delay-100">
            <label className="block text-xs sm:text-sm font-medium text-gray-300 mb-2">
              Fächername
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="z.B. Mathematik"
              className="w-full text-sm bg-white/5 border border-white/10 rounded-lg px-3 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/25 transition-all transform hover:scale-[1.01] duration-200"
              disabled={isLoading}
              autoFocus
            />
          </div>

          {/* Type Select */}
          <div className="animate-in fade-in slide-in-from-left-4 duration-300 delay-150">
            <label className="block text-xs sm:text-sm font-medium text-gray-300 mb-2">
              Fachtyp
            </label>
            <div className="grid grid-cols-2 gap-3">
              {['HAUPTFACH', 'NEBENFACH'].map((t, idx) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setType(t as 'HAUPTFACH' | 'NEBENFACH')}
                  className={`py-2.5 px-3 rounded-lg font-medium text-xs sm:text-sm transition-all border transform hover:scale-105 active:scale-[0.95] duration-200 animate-in fade-in zoom-in-95 ${
                    type === t
                      ? 'bg-gradient-to-r from-blue-500/20 to-purple-500/20 border-blue-500/50 text-blue-200'
                      : 'bg-white/5 border-white/10 text-gray-400 hover:bg-white/10 hover:border-white/20'
                  }`}
                  disabled={isLoading}
                  style={{ animationDelay: `${150 + idx * 50}ms` }}
                >
                  {t === 'HAUPTFACH' ? 'Hauptfach' : 'Nebenfach'}
                </button>
              ))}
            </div>
          </div>

          {/* Color Picker */}
          <div className="animate-in fade-in slide-in-from-left-4 duration-300 delay-200">
            <label className="block text-xs sm:text-sm font-medium text-gray-300 mb-3">
              Farbe
            </label>
            <div className="grid grid-cols-6 gap-2">
              {COLOR_PRESETS.map((c, idx) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  className={`aspect-square rounded-lg border-2 transition-all transform text-xs animate-in zoom-in-75 ${
                    color === c
                      ? 'border-white scale-110 shadow-lg shadow-white/20'
                      : 'border-transparent hover:scale-105'
                  }`}
                  style={{
                    backgroundColor: c,
                    animationDelay: `${200 + (idx % 6) * 20}ms`,
                  }}
                  disabled={isLoading}
                  title={c}
                />
              ))}
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-lg px-3 py-2 text-xs sm:text-sm text-red-300 animate-in shake duration-300">
              {error}
            </div>
          )}

          {/* Buttons */}
          <div className="flex gap-3 pt-4 flex-col sm:flex-row animate-in fade-in slide-in-from-bottom-4 duration-300 delay-300">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2.5 sm:py-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-gray-300 font-medium text-sm transition-all transform hover:scale-[1.02] active:scale-[0.98] duration-200"
              disabled={isLoading}
            >
              Abbrechen
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2.5 sm:py-3 bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 rounded-lg text-white font-medium text-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed transform hover:scale-[1.02] active:scale-[0.98] duration-200"
              disabled={isLoading || !name.trim()}
            >
              {isLoading ? 'Wird hinzugefügt...' : 'Hinzufügen'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
