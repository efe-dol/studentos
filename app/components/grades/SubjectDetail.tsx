'use client';

import { useState } from 'react';
import { ArrowLeft, Plus, Trash2 } from 'lucide-react';
import { Subject, Grade } from '@/lib/grades/hooks';
import type { AddGradeData } from './AddGradeDialog';
import {
  calculateSubjectAverage,
  calculateKLAverage,
  calculateGLAverage,
  formatGrade,
  getGradeLabel,
} from '@/lib/grades/calculator';
import AddGradeDialog from './AddGradeDialog';

interface SubjectDetailProps {
  subject: Subject;
  grades: Grade[];
  onBack: () => void;
  onAddGrade: (gradeData: AddGradeData) => Promise<void>;
  onDeleteGrade: (gradeId: string) => Promise<void>;
  isLoading?: boolean;
}

export default function SubjectDetail({
  subject,
  grades,
  onBack,
  onAddGrade,
  onDeleteGrade,
  isLoading = false,
}: SubjectDetailProps) {
  const [showAddGradeDialog, setShowAddGradeDialog] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleBackClick = () => {
    onBack();
  };

  const subjectGrades = grades.filter(g => g.subject_id === subject.id);
  const average = calculateSubjectAverage(subjectGrades);
  const klAverage = calculateKLAverage(subjectGrades);
  const glAverage = calculateGLAverage(subjectGrades);

  const handleDeleteGrade = async (gradeId: string) => {
    setDeletingId(gradeId);
    try {
      await onDeleteGrade(gradeId);
    } finally {
      setDeletingId(null);
    }
  };

  const getGradeTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      'SCHULAUFGABE': 'Schulaufgabe',
      'MÜNDLICH': 'Mündlich',
      'KURZARBEIT': 'Kurzarbeit',
      'KSL': 'schrift. Leistungskontrolle',
    };
    return labels[type] || type;
  };

  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleDateString('de-DE', {
        day: '2-digit',
        month: '2-digit',
        year: '2-digit',
      });
    } catch {
      return dateString;
    }
  };

  return (
    <div className="space-y-6 transition-all duration-300">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 animate-in slide-in-from-left duration-300 delay-75">
        <button
          onClick={handleBackClick}
          className="p-2 sm:p-2 hover:bg-white/5 rounded-lg transition-colors text-gray-400 hover:text-white flex-shrink-0 hover:scale-110"
          title="Zurück"
        >
          <ArrowLeft className="w-5 h-5 sm:w-6 sm:h-6" />
        </button>
        <div className="flex-1 min-w-0 animate-in slide-in-from-left duration-300 delay-100">
          <h1 className="text-2xl sm:text-3xl font-bold text-white mb-2 truncate">{subject.name}</h1>
          <div
            className="w-8 h-8 rounded-lg animate-in zoom-in duration-300 delay-150"
            style={{ backgroundColor: subject.color }}
          />
        </div>
      </div>

      {/* Grade Averages */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 animate-in slide-in-from-bottom duration-300 delay-150">
        {/* Overall Average */}
        <div className="bg-gradient-to-br from-blue-500/10 to-purple-500/10 border border-blue-500/20 rounded-lg p-4 sm:p-6 animate-in fade-in duration-300 delay-150" style={{animationFillMode: 'both'}}>
          <div className="text-xs sm:text-sm font-medium text-gray-400 mb-1">Fachdurchschnitt</div>
          <div className="text-2xl sm:text-3xl font-bold text-white">
            {average !== null ? formatGrade(average) : '-'}
          </div>
          {average !== null && (
            <div className="text-xs text-gray-400 mt-2">{getGradeLabel(average)}</div>
          )}
        </div>

        {/* KL Average */}
        <div className="bg-gradient-to-br from-green-500/10 to-yellow-500/10 border border-green-500/20 rounded-lg p-4 sm:p-6 animate-in fade-in duration-300 delay-200" style={{animationFillMode: 'both'}}>
          <div className="text-xs sm:text-sm font-medium text-gray-400 mb-1">KL Durchschnitt</div>
          <div className="text-2xl sm:text-3xl font-bold text-white">
            {klAverage !== null ? formatGrade(klAverage) : '-'}
          </div>
          <div className="text-xs text-gray-500 mt-2">Kleine Leistungen</div>
        </div>

        {/* GL Average */}
        <div className="bg-gradient-to-br from-orange-500/10 to-red-500/10 border border-orange-500/20 rounded-lg p-4 sm:p-6 animate-in fade-in duration-300 delay-250" style={{animationFillMode: 'both'}}>
          <div className="text-xs sm:text-sm font-medium text-gray-400 mb-1">GL Durchschnitt</div>
          <div className="text-2xl sm:text-3xl font-bold text-white">
            {glAverage !== null ? formatGrade(glAverage) : '-'}
          </div>
          <div className="text-xs text-gray-500 mt-2">Große Leistungen (2x)</div>
        </div>
      </div>

      {/* Grades List */}
      <div className="bg-white/5 border border-white/10 rounded-lg overflow-hidden animate-in slide-in-from-bottom duration-300 delay-300" style={{animationFillMode: 'both'}}>
        <div className="p-4 sm:p-6 border-b border-white/10 flex items-center justify-between">
          <h2 className="text-base sm:text-lg font-bold text-white">
            Noten ({subjectGrades.length})
          </h2>
          <button
            onClick={() => setShowAddGradeDialog(true)}
            className="px-3 py-1.5 sm:px-4 sm:py-2 bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 rounded-lg text-white font-medium text-xs sm:text-sm flex items-center gap-2 ml-2 transition-all flex-shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">Note hinzufügen</span>
            <span className="sm:hidden">+</span>
          </button>
        </div>

        {subjectGrades.length === 0 ? (
          <div className="p-8 text-center">
            <p className="text-gray-400 mb-4 text-sm">Keine Noten vorhanden</p>
            <button
              onClick={() => setShowAddGradeDialog(true)}
              className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg text-gray-300 font-medium transition-all inline-flex items-center gap-2 text-sm"
            >
              <Plus className="w-4 h-4" />
              Erste Note hinzufügen
            </button>
          </div>
        ) : (
          <div className="divide-y divide-white/10">
            {subjectGrades.map((grade, idx) => (
              <div
                key={grade.id}
                className="p-4 sm:p-6 hover:bg-white/5 transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 group animate-in slide-in-from-left duration-300"
                style={{ animationDelay: `${300 + idx * 50}ms`, animationFillMode: 'both' }}
              >
                <div className="flex-1 min-w-0 w-full">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="text-2xl sm:text-3xl font-bold text-white">
                      {formatGrade(grade.grade)}
                    </div>
                    <div className="min-w-0">
                      <div className="text-xs sm:text-sm font-medium text-gray-300">
                        {getGradeTypeLabel(grade.grade_type)}
                      </div>
                      <div className="text-xs text-gray-500">
                        {formatDate(grade.grade_date)}
                        {grade.weight !== 1 && ` • ${grade.weight}x`}
                      </div>
                    </div>
                  </div>
                  {grade.description && (
                    <p className="text-xs sm:text-sm text-gray-400 truncate">
                      {grade.description}
                    </p>
                  )}
                </div>
                <button
                  onClick={() => handleDeleteGrade(grade.id)}
                  disabled={deletingId === grade.id || isLoading}
                  className="p-2 text-gray-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all opacity-0 sm:opacity-0 group-hover:opacity-100 flex-shrink-0"
                  title="Löschen"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="flex gap-3 animate-in slide-in-from-bottom duration-300 delay-350" style={{animationFillMode: 'both'}}>
        <button
          onClick={handleBackClick}
          className="flex-1 px-4 py-2 sm:py-3 bg-white/10 hover:bg-white/20 border border-white/20 rounded-lg text-gray-300 font-medium transition-all text-sm sm:text-base"
        >
          Abbrechen
        </button>
      </div>

      {/* Add Grade Dialog */}
      <AddGradeDialog
        isOpen={showAddGradeDialog}
        subjectId={subject.id}
        onClose={() => setShowAddGradeDialog(false)}
        onAdd={onAddGrade}
      />
    </div>
  );
}
