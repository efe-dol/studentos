'use client';

import { useEffect, useState } from 'react';
import { useSubjects, useGrades, Subject } from '@/lib/grades/hooks';
import {
  calculateOverallAverage,
  calculateSubjectAverage,
  formatGrade,
  getGradeLabel,
} from '@/lib/grades/calculator';
import AddSubjectDialog from './AddSubjectDialog';
import AddGradeDialog from './AddGradeDialog';
import SubjectDetail from './SubjectDetail';
import { Plus, BookOpen, RotateCw } from 'lucide-react';

export default function GradesTab() {
  const [selectedSubjectId, setSelectedSubjectId] = useState<string | null>(null);
  const [showAddGradeDialog, setShowAddGradeDialog] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const {
    subjects,
    loading: subjectsLoading,
    error: subjectsError,
    fetchSubjects,
    updateSubject,
    deleteSubject,
  } = useSubjects();

  const {
    grades,
    loading: gradesLoading,
    error: gradesError,
    fetchGrades,
    addGrade,
    updateGrade,
    deleteGrade,
  } = useGrades();

  useEffect(() => {
    fetchSubjects();
    fetchGrades();
  }, [fetchSubjects, fetchGrades]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await Promise.all([fetchSubjects(), fetchGrades()]);
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleAddGrade = async (gradeData: any) => {
    if (!selectedSubjectId) return;
    await addGrade(
      selectedSubjectId,
      gradeData.grade,
      gradeData.gradeType,
      gradeData.weight,
      gradeData.description,
      gradeData.gradeDate
    );
  };

  const handleSelectSubject = (subjectId: string) => {
    setIsTransitioning(true);
    setTimeout(() => {
      setSelectedSubjectId(subjectId);
    }, 150);
  };

  const handleBack = () => {
    setIsTransitioning(true);
    setTimeout(() => {
      setSelectedSubjectId(null);
      setIsTransitioning(false);
    }, 150);
  };

  const hauptfaecher = subjects.filter(s => s.type === 'HAUPTFACH');
  const nebenfaecher = subjects.filter(s => s.type === 'NEBENFACH');
  const selectedSubject = subjects.find(s => s.id === selectedSubjectId);
  const overallAverage = calculateOverallAverage(
    subjects.map(s => ({
      ...s,
      grades: grades.filter(g => g.subject_id === s.id),
    }))
  );

  if (selectedSubject) {
    return (
      <div key={selectedSubjectId} className={`transition-opacity duration-300 ${isTransitioning ? 'opacity-0' : 'opacity-100'}`}>
        <SubjectDetail
          subject={selectedSubject}
          grades={grades}
          onBack={handleBack}
          onAddGrade={handleAddGrade}
          onDeleteGrade={deleteGrade}
          isLoading={gradesLoading}
        />
      </div>
    );
  }

  return (
    <div className={`space-y-6 transition-all duration-300 ${isTransitioning ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}>
      {/* Header */}
      <div className="animate-in slide-in-from-top duration-300 delay-75">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h1 className="text-3xl font-bold text-white mb-1">Fächer & Noten</h1>
            <p className="text-gray-400">Verwalte deine Fächer und trage deine Noten ein</p>
          </div>
          <button
            onClick={handleRefresh}
            disabled={isRefreshing || subjectsLoading}
            className="p-2.5 rounded-lg hover:bg-white/10 border border-white/10 text-gray-400 hover:text-white transition-all disabled:opacity-50"
            title="Daten neu laden"
          >
            <RotateCw className={`w-5 h-5 ${isRefreshing ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Overall Average */}
      {subjects.length > 0 && (
        <div className="bg-gradient-to-r from-emerald-500/10 to-teal-500/10 border border-emerald-500/20 rounded-lg p-6 animate-in slide-in-from-left duration-300 delay-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-sm mb-1">Gesamtdurchschnitt</p>
              <p className="text-4xl font-bold text-white">
                {overallAverage !== null ? formatGrade(overallAverage) : '-'}
              </p>
              {overallAverage !== null && (
                <p className="text-gray-500 text-xs mt-2">{getGradeLabel(overallAverage)}</p>
              )}
            </div>
            <div className="text-right">
              <p className="text-gray-400 text-sm">Noten: {grades.length}</p>
              <p className="text-gray-400 text-sm">Fächer: {subjects.length}</p>
            </div>
          </div>
        </div>
      )}

      {/* Hauptfächer */}
      {hauptfaecher.length > 0 && (
        <div className="animate-in slide-in-from-left duration-300 delay-150">
          <h2 className="text-xl font-bold text-white mb-3 flex items-center gap-2 animate-in fade-in duration-300 delay-100">
            <BookOpen className="w-5 h-5 text-blue-400" />
            Hauptfächer
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {hauptfaecher.map((subject, idx) => {
              const subjectGrades = grades.filter(g => g.subject_id === subject.id);
              const avg = calculateSubjectAverage(subjectGrades);
              return (
                <button
                  key={subject.id}
                  onClick={() => handleSelectSubject(subject.id)}
                  className="p-4 bg-gradient-to-br from-white/10 to-white/5 border border-white/10 hover:border-white/20 hover:bg-gradient-to-br hover:from-white/15 hover:to-white/10 hover:shadow-xl hover:shadow-blue-500/10 rounded-lg transition-all duration-300 group animate-in slide-in-from-left"
                  style={{ animationDelay: `${200 + idx * 50}ms` }}
                >
                  <div className="flex items-start justify-between mb-3">
                    <h3 className="font-bold text-white text-lg flex-1 text-left group-hover:text-blue-300 transition-colors">
                      {subject.name}
                    </h3>
                    <div
                      className="w-6 h-6 rounded-full flex-shrink-0 shadow-lg group-hover:scale-110 transition-transform"
                      style={{ backgroundColor: subject.color }}
                    />
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-white">
                      {avg !== null ? formatGrade(avg) : '-'}
                    </p>
                    {avg !== null && (
                      <p className="text-xs text-gray-500 mt-1">{getGradeLabel(avg)}</p>
                    )}
                    <p className="text-xs text-gray-600 mt-2">
                      {subjectGrades.length} Note{subjectGrades.length !== 1 ? 'n' : ''}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Nebenfächer */}
      {nebenfaecher.length > 0 && (
        <div className="animate-in slide-in-from-left duration-300 delay-200">
          <h2 className="text-xl font-bold text-white mb-3 flex items-center gap-2 animate-in fade-in duration-300 delay-150">
            <BookOpen className="w-5 h-5 text-purple-400" />
            Nebenfächer
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {nebenfaecher.map((subject, idx) => {
              const subjectGrades = grades.filter(g => g.subject_id === subject.id);
              const avg = calculateSubjectAverage(subjectGrades);
              return (
                <button
                  key={subject.id}
                  onClick={() => handleSelectSubject(subject.id)}
                  className="p-4 bg-gradient-to-br from-white/10 to-white/5 border border-white/10 hover:border-white/20 hover:bg-gradient-to-br hover:from-white/15 hover:to-white/10 hover:shadow-xl hover:shadow-purple-500/10 rounded-lg transition-all duration-300 group animate-in slide-in-from-left"
                  style={{ animationDelay: `${300 + idx * 50}ms` }}
                >
                  <div className="flex items-start justify-between mb-3">
                    <h3 className="font-bold text-white text-lg flex-1 text-left group-hover:text-purple-300 transition-colors">
                      {subject.name}
                    </h3>
                    <div
                      className="w-6 h-6 rounded-full flex-shrink-0 shadow-lg group-hover:scale-110 transition-transform"
                      style={{ backgroundColor: subject.color }}
                    />
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-white">
                      {avg !== null ? formatGrade(avg) : '-'}
                    </p>
                    {avg !== null && (
                      <p className="text-xs text-gray-500 mt-1">{getGradeLabel(avg)}</p>
                    )}
                    <p className="text-xs text-gray-600 mt-2">
                      {subjectGrades.length} Note{subjectGrades.length !== 1 ? 'n' : ''}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Empty State */}
      {subjects.length === 0 && (
        <div className="bg-white/5 border border-white/10 rounded-lg p-12 text-center animate-in fade-in zoom-in duration-300">
          <BookOpen className="w-12 h-12 text-gray-600 mx-auto mb-4 animate-bounce" />
          <h3 className="text-lg font-bold text-white mb-2">Keine Fächer vorhanden</h3>
          <p className="text-gray-400 mb-4">
            Öffne die Einstellungen und füge dein erstes Fach hinzu, um Noten zu verwalten
          </p>
        </div>
      )}

      {/* Add Subject Dialog */}
      {/* Removed - Now handled through Settings Modal */}

      {/* Error Messages */}
      {subjectsError && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 text-red-300 animate-in shake duration-300">
          {subjectsError}
        </div>
      )}
      {gradesError && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 text-red-300 animate-in shake duration-300">
          {gradesError}
        </div>
      )}
    </div>
  );
}
