'use client';

import { useCallback, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Star } from 'lucide-react';

interface AddGradeDialogProps {
  isOpen: boolean;
  subjectId?: string;
  onClose: () => void;
  onAdd: (gradeData: AddGradeData) => Promise<void>;
  initialData?: AddGradeData | null;
  title?: string;
  submitLabel?: string;
}

export type AddGradeData = {
  grade: number;
  gradeType: 'SCHULAUFGABE' | 'MÜNDLICH' | 'KURZARBEIT' | 'KSL';
  weight?: number;
  description?: string;
  gradeDate?: string;
};

type GradeType = AddGradeData['gradeType'];

const GRADE_TYPES: Array<{ id: GradeType; label: string; category: 'GL' | 'KL'; hint: string }> = [
  { id: 'SCHULAUFGABE', label: 'Schulaufgabe (GL)', category: 'GL', hint: 'Großer Leistungsnachweis (Schulaufgabe)' },
  { id: 'MÜNDLICH', label: 'Mündlich', category: 'KL', hint: 'Kleiner Leistungsnachweis' },
  { id: 'KURZARBEIT', label: 'Kurzarbeit', category: 'KL', hint: 'Kleiner Leistungsnachweis' },
  { id: 'KSL', label: 'Stegreifaufgabe', category: 'KL', hint: 'Kleiner Leistungsnachweis' },
];

export default function AddGradeDialog({
  isOpen,
  subjectId,
  onClose,
  onAdd,
  initialData,
  title,
  submitLabel,
}: AddGradeDialogProps) {
  const [gradeInput, setGradeInput] = useState('');
  const [gradeType, setGradeType] = useState<GradeType>('MÜNDLICH');
  const [weight, setWeight] = useState(1.0);
  const [description, setDescription] = useState('');
  const [gradeDate, setGradeDate] = useState(new Date().toISOString().split('T')[0]);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [customWeightInput, setCustomWeightInput] = useState('');
  const [isMounted, setIsMounted] = useState(false);

  const parseWeightInput = useCallback((value: string): number | null => {
    const normalized = value.trim().replace(',', '.');
    if (!normalized) return null;

    const parsed = Number(normalized);
    if (!Number.isFinite(parsed) || parsed <= 0) return null;

    return parsed;
  }, []);

  useEffect(() => {
    setIsMounted(true);
    return () => setIsMounted(false);
  }, []);

  const resetForm = useCallback(() => {
    setGradeInput('');
    setGradeType('MÜNDLICH');
    setWeight(1.0);
    setDescription('');
    setGradeDate(new Date().toISOString().split('T')[0]);
    setShowAdvanced(false);
    setError('');
    setCustomWeightInput('');
  }, []);

  useEffect(() => {
    if (!isOpen) return;

    if (initialData) {
      setGradeInput(String(initialData.grade));
      setGradeType(initialData.gradeType);
      setWeight(initialData.weight ?? 1.0);
      setDescription(initialData.description || '');
      setGradeDate(initialData.gradeDate ? String(initialData.gradeDate).split('T')[0] : new Date().toISOString().split('T')[0]);
      setShowAdvanced(Boolean(initialData.description) || (initialData.weight ?? 1.0) !== 1.0);
      setError('');
      setCustomWeightInput(String(initialData.weight ?? 1.0).replace('.', ','));
      return;
    }

    resetForm();
  }, [isOpen, initialData, resetForm]);

  const handleClose = useCallback((force = false) => {
    if (isSubmitting && !force) return;
    resetForm();
    onClose();
  }, [isSubmitting, onClose, resetForm]);

  const applyCustomWeight = useCallback(() => {
    if (!customWeightInput.trim()) {
      if (error) setError('');
      return;
    }

    const parsed = parseWeightInput(customWeightInput);
    if (parsed === null) {
      setError('Eigenes Gewicht ist ungültig. Beispiel: 0,75');
      return;
    }

    setWeight(parsed);
    setCustomWeightInput(String(parsed).replace('.', ','));
    if (error) setError('');
  }, [customWeightInput, error, parseWeightInput]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!gradeInput.trim()) {
      setError('Note ist erforderlich');
      return;
    }

    const gradeNum = Number(gradeInput.trim());
    if (!Number.isInteger(gradeNum) || gradeNum < 1 || gradeNum > 6) {
      setError('Note muss eine ganze Zahl zwischen 1 und 6 sein');
      return;
    }

    // Use the currently visible custom input as source of truth on submit
    // to avoid stale state when blur/setState and submit happen close together.
    let effectiveWeight = weight;
    if (customWeightInput.trim()) {
      const parsedFromInput = parseWeightInput(customWeightInput);
      if (parsedFromInput === null) {
        setError('Eigenes Gewicht ist ungültig. Beispiel: 0,75');
        return;
      }
      effectiveWeight = parsedFromInput;
    }

    if (!Number.isFinite(effectiveWeight) || effectiveWeight <= 0) {
      setError('Gewicht muss größer als 0 sein');
      return;
    }

    setIsSubmitting(true);
    try {
      await onAdd({
        grade: gradeNum,
        gradeType,
        weight: effectiveWeight !== 1 ? effectiveWeight : undefined,
        description: description || undefined,
        gradeDate: gradeDate || undefined,
      });
      handleClose(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Fehler beim Hinzufügen der Note');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen || !subjectId || !isMounted) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] overflow-y-auto bg-black/60 backdrop-blur-sm p-4 grid place-items-center modal-backdrop-animate"
      onClick={() => handleClose()}
    >
      <div className="w-full max-w-md my-6">
        <div
          className="bg-[#141414] rounded-2xl shadow-2xl p-8 w-full border border-white/10 modal-animate max-h-[90vh] overflow-y-auto"
          onClick={(e) => e.stopPropagation()}
        >
        {/* Header */}
        <div className="flex items-center justify-between mb-6 gap-3">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <div className="p-2 bg-gradient-to-br from-yellow-500/20 to-orange-500/20 rounded-lg flex-shrink-0">
              <Star className="w-5 h-5 text-yellow-400" />
            </div>
            <h2 className="text-lg sm:text-xl font-bold text-white truncate">{title || 'Note eintragen'}</h2>
          </div>
          <button
            onClick={() => handleClose()}
            className="p-2 hover:bg-white/5 rounded-lg transition-colors flex-shrink-0"
            disabled={isSubmitting}
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
              step="1"
              value={gradeInput}
              onChange={(e) => {
                setGradeInput(e.target.value);
                if (error) setError('');
              }}
              placeholder="z.B. 2"
              className="w-full text-lg font-medium bg-white/5 border border-white/10 rounded-lg px-3 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/25 transition-all"
              disabled={isSubmitting}
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
                  onClick={() => setGradeType(type.id)}
                  className={`w-full p-3 rounded-lg border text-left transition-all text-sm ${
                    gradeType === type.id
                      ? 'bg-gradient-to-r from-blue-500/20 to-purple-500/20 border-blue-500/50'
                      : 'bg-white/5 border-white/10 hover:bg-white/10 hover:border-white/20'
                  }`}
                  disabled={isSubmitting}
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
              disabled={isSubmitting}
            />
          </div>

          {/* Advanced Options Toggle */}
          <button
            type="button"
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="text-xs sm:text-sm font-medium text-blue-400 hover:text-blue-300 transition-colors w-full text-left p-2 rounded hover:bg-white/5"
            disabled={isSubmitting}
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
                  disabled={isSubmitting}
                />
              </div>

              {/* Weight */}
              <div>
                <label className="block text-xs sm:text-sm font-medium text-gray-300 mb-2">
                  Einzelgewichtung
                </label>
                <div className="flex flex-wrap gap-2 mb-2">
                  {[0.5, 1, 1.5, 2].map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => {
                        setWeight(preset);
                        setCustomWeightInput(String(preset).replace('.', ','));
                        if (error) setError('');
                      }}
                      className={`px-2.5 py-1 rounded-md text-xs border transition-colors ${
                        weight === preset
                          ? 'bg-blue-500/20 border-blue-500/50 text-blue-300'
                          : 'bg-white/5 border-white/10 text-gray-300 hover:bg-white/10'
                      }`}
                      disabled={isSubmitting}
                    >
                      {String(preset).replace('.', ',')}x
                    </button>
                  ))}
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    inputMode="decimal"
                    value={customWeightInput}
                    onChange={(e) => setCustomWeightInput(e.target.value)}
                    onBlur={applyCustomWeight}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        applyCustomWeight();
                      }
                    }}
                    placeholder="Eigener Wert z.B. 0,75"
                    className="flex-1 text-sm bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/25 transition-all"
                    disabled={isSubmitting}
                  />
                  <button
                    type="button"
                    onClick={applyCustomWeight}
                    className="px-3 py-2 rounded-lg text-xs bg-white/10 hover:bg-white/20 border border-white/10 text-gray-200 transition-colors"
                    disabled={isSubmitting}
                  >
                    Setzen
                  </button>
                </div>
                {weight !== 1.0 && (
                  <p className="text-xs text-gray-500 mt-1">Diese Note zählt {String(weight).replace('.', ',')}x</p>
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
              onClick={() => handleClose()}
              className="flex-1 px-4 py-2.5 sm:py-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-gray-300 font-medium text-sm transition-all"
              disabled={isSubmitting}
            >
              Abbrechen
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2.5 sm:py-3 bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 rounded-lg text-white font-medium text-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Wird gespeichert...' : submitLabel || 'Speichern'}
            </button>
          </div>
        </form>
        </div>
      </div>
    </div>,
    document.body
  );
}
