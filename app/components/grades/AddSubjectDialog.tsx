'use client';

import { useCallback, useState } from 'react';
import { X } from 'lucide-react';

interface AddSubjectDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (name: string, type: 'HAUPTFACH' | 'NEBENFACH', color: string) => Promise<void>;
}

const COLOR_PRESETS = [
  '#ef4444', '#f97316', '#eab308', '#22c55e', '#14b8a6', '#3b82f6',
  '#f87171', '#fb923c', '#facc15', '#4ade80', '#2dd4bf', '#60a5fa',
  '#fca5a5', '#fbbd23', '#fde047', '#86efac', '#67e8f9', '#93c5fd',
  '#6366f1', '#8b5cf6', '#ec4899', '#818cf8', '#a78bfa', '#f472b6',
];

export default function AddSubjectDialog({ isOpen, onClose, onAdd }: AddSubjectDialogProps) {
  const [name, setName] = useState('');
  const [type, setType] = useState<'HAUPTFACH' | 'NEBENFACH'>('HAUPTFACH');
  const [color, setColor] = useState('#3b82f6');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleClose = useCallback(() => {
    if (!isLoading) {
      setName('');
      setType('HAUPTFACH');
      setColor('#3b82f6');
      setError('');
      onClose();
    }
  }, [isLoading, onClose]);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();

      if (!name.trim()) {
        setError('Fächername ist erforderlich');
        return;
      }

      setIsLoading(true);
      setError('');

      try {
        await onAdd(name.trim(), type, color);
        setName('');
        setType('HAUPTFACH');
        setColor('#3b82f6');
        handleClose();
      } catch (err) {
        setError(
          err instanceof Error ? err.message : 'Fehler beim Hinzufügen des Fachs'
        );
      } finally {
        setIsLoading(false);
      }
    },
    [name, type, color, onAdd, handleClose]
  );

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
      <div className="bg-gradient-to-br from-[#1a1a1a] to-[#0d0d0d] rounded-2xl shadow-2xl p-7 max-w-md w-full border border-white/5 max-h-[90vh] overflow-y-auto animate-in fade-in zoom-in-95 duration-300">
        {/* Header */}
        <div className="flex items-center justify-between mb-6 animate-in fade-in slide-in-from-top-4 duration-300">
          <h2 className="text-xl sm:text-2xl font-bold text-white">
            Neues Fach
          </h2>
          <button
            onClick={handleClose}
            disabled={isLoading}
            className="p-2 hover:bg-white/10 rounded-lg text-gray-400 hover:text-white transition-all transform hover:scale-110 active:scale-[0.95] duration-200 disabled:opacity-50"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6 mb-6">
          {/* Name Input */}
          <div className="space-y-2 animate-in fade-in slide-in-from-left-4 duration-300 delay-100">
            <label htmlFor="name" className="block text-sm font-medium text-gray-300">
              Fächername
            </label>
            <input
              id="name"
              type="text"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                setError('');
              }}
              placeholder="z.B. Mathematik"
              disabled={isLoading}
              className="w-full text-base bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/25 transition-all"
            />
          </div>

          {/* Type Selection */}
          <div className="space-y-2 animate-in fade-in slide-in-from-left-4 duration-300 delay-150">
            <label className="block text-sm font-medium text-gray-300">
              Fachtyp
            </label>
            <div className="grid grid-cols-2 gap-3">
              {['HAUPTFACH', 'NEBENFACH'].map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setType(t as 'HAUPTFACH' | 'NEBENFACH')}
                  disabled={isLoading}
                  className={`py-3 px-4 rounded-lg font-medium text-sm transition-all border transform hover:scale-105 active:scale-[0.95] duration-200 disabled:opacity-50 ${
                    type === t
                      ? 'bg-gradient-to-r from-blue-500/20 to-purple-500/20 border-blue-500/50 text-blue-200'
                      : 'bg-white/5 border-white/10 text-gray-400 hover:bg-white/10'
                  }`}
                >
                  {t === 'HAUPTFACH' ? 'Hauptfach' : 'Nebenfach'}
                </button>
              ))}
            </div>
          </div>

          {/* Color Selection */}
          <div className="space-y-2 animate-in fade-in slide-in-from-left-4 duration-300 delay-200">
            <label className="block text-sm font-medium text-gray-300">
              Farbe
            </label>
            <div className="grid grid-cols-6 gap-2">
              {COLOR_PRESETS.map((c, idx) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  disabled={isLoading}
                  className={`aspect-square rounded-lg border-2 transition-all transform animate-in zoom-in-75 disabled:opacity-50 ${
                    color === c
                      ? 'border-white scale-110 shadow-lg shadow-white/20'
                      : 'border-transparent hover:scale-105'
                  }`}
                  style={{
                    backgroundColor: c,
                    animationDelay: `${200 + (idx % 6) * 20}ms`,
                  }}
                  title={c}
                />
              ))}
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-300 text-sm animate-in fade-in shake duration-300">
              {error}
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-3 flex-col sm:flex-row pt-2 animate-in fade-in slide-in-from-bottom-4 duration-300 delay-300">
            <button
              type="button"
              onClick={handleClose}
              disabled={isLoading}
              className="flex-1 px-4 py-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-gray-300 font-medium text-base transition-all transform hover:scale-[1.02] active:scale-[0.98] duration-200 disabled:opacity-50"
            >
              Abbrechen
            </button>
            <button
              type="submit"
              disabled={isLoading || !name.trim()}
              className="flex-1 px-4 py-3 bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 rounded-lg text-white font-medium text-base transition-all disabled:opacity-50 transform hover:scale-[1.02] active:scale-[0.98] duration-200"
            >
              {isLoading ? 'Wird hinzugefügt...' : 'Fach hinzufügen'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
