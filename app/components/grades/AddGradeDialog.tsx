'use client';

import { useState } from 'react';
import { X, Star } from 'lucide-react';

interface AddGradeDialogProps {
  isOpen: boolean;
  subjectId?: string;
  onClose: () => void;
  onAdd: (gradeData: {
    grade: number;
    gradeType: 'SCHULAUFGABE' | 'MÜNDLICH' | 'KURZARBEIT' | 'KSL';
    weight?: number;
    description?: string;
    gradeDate?: string;
  }) => Promise<void>;
  isLoading?: boolean;
}

const GRADE_TYPES = [
  { id: 'SCHULAUFGABE', label: 'Schulaufgabe (GL)', category: 'GL', hint: 'Große Leistungsnachweis - zählt 2x' },
  { id: 'MÜNDLICH', label: 'Mündlich', category: 'KL', hint: 'Kleine Leistungsnachweis' },
  { id: 'KURZARBEIT', label: 'Kurzarbeit', category: 'KL', hint: 'Kleine Leistungsnachweis' },
  { id: 'KSL', label: 'schriftliche Leistungskontrolle', category: 'KL', hint: 'Kleine Leistungsnachweis' },
];

export default function AddGradeDialog({
  isOpen,
  subjectId,
  onClose,
  onAdd,
  isLoading = false,
}: AddGradeDialogProps) {
  const [grade, setGrade] = useState<number | ''>('');
  const [gradeType, setGradeType] = useState<'SCHULAUFGABE' | 'MÜNDLICH' | 'KURZARBEIT' | 'KSL'>('MÜNDLICH');
  const [weight, setWeight] = useState(1.0);
  const [description, setDescription] = useState('');
  const [gradeDate, setGradeDate] = useState(new Date().toISOString().split('T')[0]);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (grade === '') {
      setError('Note ist erforderlich');
      return;
    }

    const gradeNum = parseFloat(grade.toString());
    if (isNaN(gradeNum) || gradeNum < 1 || gradeNum > 6) {
      setError('Note muss zwischen 1 und 6 liegen');
      return;
    }

    if (weight <= 0) {
      setError('Gewicht muss größer als 0 sein');
      return;
    }

    try {
      await onAdd({
        grade: gradeNum,
        gradeType,
        weight: weight !== 1 ? weight : undefined,
        description: description || undefined,
        gradeDate: gradeDate || undefined,
      });

      // Reset form
      setGrade('');
      setGradeType('MÜNDLICH');
      setWeight(1.0);
      setDescription('');
      setGradeDate(new Date().toISOString().split('T')[0]);
      setShowAdvanced(false);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Fehler beim Hinzufügen der Note');
    }
  };

  if (!isOpen || !subjectId) return null;

  const selectedType = GRADE_TYPES.find(t => t.id === gradeType);

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
      <div className="bg-gradient-to-br from-[#1a1a1a] to-[#0d0d0d] rounded-2xl shadow-2xl p-6 max-w-md w-full border border-white/5 animate-in fade-in zoom-in-95 duration-200 max-h-[95vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6 gap-3">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <div className="p-2 bg-gradient-to-br from-yellow-500/20 to-orange-500/20 rounded-lg flex-shrink-0">
              <Star className="w-5 h-5 text-yellow-400" />
            </div>
            <h2 className="text-lg sm:text-xl font-bold text-white truncate">Note eintragen</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/5 rounded-lg transition-colors flex-shrink-0"
          >
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Note Input */}
          <div>
            <label className="block text-xs sm:text-sm font-medium text-gray-300 mb-2">
              Note (1-6)
            </label>
            <input
              type="number"
              min="1"
              max="6"
              step="0.1"
              value={grade}
              onChange={(e) => setGrade(e.target.value ? parseFloat(e.target.value) : '')}
              placeholder="z.B. 2.5"
              className="w-full text-lg font-medium bg-white/5 border border-white/10 rounded-lg px-3 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/25 transition-all"
              disabled={isLoading}
              autoFocus
            />
          </div>

          {/* Grade Type Selection */}
          <div>
            <label className="block text-xs sm:text-sm font-medium text-gray-300 mb-2">
              Notentyp
            </label>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {GRADE_TYPES.map((type) => (
                <button
                  key={type.id}
                  type="button"
                  onClick={() => setGradeType(type.id as any)}
                  className={`w-full p-3 rounded-lg border text-left transition-all text-sm ${
                    gradeType === type.id
                      ? 'bg-gradient-to-r from-blue-500/20 to-purple-500/20 border-blue-500/50'
                      : 'bg-white/5 border-white/10 hover:bg-white/10 hover:border-white/20'
                  }`}
                  disabled={isLoading}
                >
                  <div className="font-medium text-white text-xs sm:text-sm">{type.label}</div>
                  <div className="text-xs text-gray-400 mt-0.5">{type.hint}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Date Input */}
          <div>
            <label className="block text-xs sm:text-sm font-medium text-gray-300 mb-2">
              Notendatum
            </label>
            <input
              type="date"
              value={gradeDate}
              onChange={(e) => setGradeDate(e.target.value)}
              className="w-full text-sm bg-white/5 border border-white/10 rounded-lg px-3 py-3 text-white focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/25 transition-all"
              disabled={isLoading}
            />
          </div>

          {/* Advanced Options Toggle */}
          <button
            type="button"
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="text-xs sm:text-sm font-medium text-blue-400 hover:text-blue-300 transition-colors w-full text-left p-2 rounded hover:bg-white/5"
            disabled={isLoading}
          >
            {showAdvanced ? '▼ Erweiterte Optionen ausblenden' : '▶ Erweiterte Optionen'}
          </button>

          {/* Advanced Options */}
          {showAdvanced && (
            <div className="space-y-4 p-4 bg-white/5 rounded-lg border border-white/10">
              {/* Description */}
              <div>
                <label className="block text-xs sm:text-sm font-medium text-gray-300 mb-2">
                  Beschreibung (optional)
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="z.B. Sehr gute Mitarbeit in der Stunde"
                  className="w-full text-sm bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/25 transition-all resize-none"
                  rows={3}
                  disabled={isLoading}
                />
              </div>

              {/* Weight */}
              <div>
                <label className="block text-xs sm:text-sm font-medium text-gray-300 mb-2">
                  Einzelgewichtung
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="0.1"
                    max="10"
                    step="0.1"
                    value={weight}
                    onChange={(e) => setWeight(parseFloat(e.target.value))}
                    className="flex-1 text-sm bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/25 transition-all"
                    disabled={isLoading}
                  />
                  <span className="text-xs text-gray-400">x</span>
                </div>
                {weight !== 1.0 && (
                  <p className="text-xs text-gray-500 mt-1">Diese Note zählt {weight}x</p>
                )}
              </div>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-lg px-3 py-2 text-xs sm:text-sm text-red-300">
              {error}
            </div>
          )}

          {/* Buttons */}
          <div className="flex gap-3 pt-4 flex-col sm:flex-row border-t border-white/10">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2.5 sm:py-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-gray-300 font-medium text-sm transition-all"
              disabled={isLoading}
            >
              Abbrechen
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2.5 sm:py-3 bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 rounded-lg text-white font-medium text-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={isLoading || grade === ''}
            >
              {isLoading ? 'Wird gespeichert...' : 'Speichern'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
