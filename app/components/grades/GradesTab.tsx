'use client';

import { useEffect, useRef, useState } from 'react';
import { useSubjects, useGrades } from '@/lib/grades/hooks';
import {
  calculateOverallAverage,
  calculateSubjectAverage,
  formatGrade,
  getGradeLabel,
} from '@/lib/grades/calculator';
import type { AddGradeData } from './AddGradeDialog';
import SubjectDetail from './SubjectDetail';
import { BookOpen, RotateCw, AlertCircle } from 'lucide-react';

export default function GradesTab() {
  const [selectedSubjectId, setSelectedSubjectId] = useState<string | null>(null);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const transitionTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const {
    subjects,
    loading: subjectsLoading,
    error: subjectsError,
    fetchSubjects,
  } = useSubjects();

  const {
    grades,
    loading: gradesLoading,
    error: gradesError,
    fetchGrades,
    addGrade,
    deleteGrade,
  } = useGrades();

  useEffect(() => {
    fetchSubjects();
    fetchGrades();
  }, [fetchSubjects, fetchGrades]);

  useEffect(() => {
    return () => {
      if (transitionTimeoutRef.current) {
        clearTimeout(transitionTimeoutRef.current);
      }
    };
  }, []);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await Promise.all([fetchSubjects(), fetchGrades()]);
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleAddGrade = async (gradeData: AddGradeData) => {
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
    if (isTransitioning) return;
    setIsTransitioning(true);
    if (transitionTimeoutRef.current) {
      clearTimeout(transitionTimeoutRef.current);
    }
    transitionTimeoutRef.current = setTimeout(() => {
      setSelectedSubjectId(subjectId);
      setIsTransitioning(false);
      transitionTimeoutRef.current = null;
    }, 180);
  };

  const handleBack = () => {
    if (isTransitioning) return;
    setIsTransitioning(true);
    if (transitionTimeoutRef.current) {
      clearTimeout(transitionTimeoutRef.current);
    }
    transitionTimeoutRef.current = setTimeout(() => {
      setSelectedSubjectId(null);
      setIsTransitioning(false);
      transitionTimeoutRef.current = null;
    }, 180);
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
      <div className={`transition-all duration-300 ${isTransitioning ? 'opacity-0 translate-x-4 scale-[0.98]' : 'opacity-100 translate-x-0 scale-100'}`}>
        <SubjectDetail
          subject={selectedSubject}
          grades={grades}
          onBack={handleBack}
          onAddGrade={handleAddGrade}
          onDeleteGrade={deleteGrade}
        />
      </div>
    );
  }

  const isLoading = subjectsLoading || gradesLoading;
  const hasError = subjectsError || gradesError;

  return (
    <div className={`space-y-6 animate-in fade-in duration-300 transition-all ${isTransitioning ? 'opacity-0 -translate-x-4 scale-[0.98] pointer-events-none' : 'opacity-100 translate-x-0 scale-100'}`}>
      {/* Header */}
      <div className="flex items-center justify-between gap-3 animate-in slide-in-from-top-2 duration-300">
        <div className="flex items-center gap-4 flex-1">
          <div className="p-3 bg-gradient-to-br from-blue-500/20 to-purple-500/20 rounded-lg">
            <BookOpen className="w-6 h-6 text-blue-400" />
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-white">Fächer & Noten</h1>
            <p className="text-sm text-gray-400">Verwalte deine Fächer und trage deine Noten ein</p>
          </div>
        </div>
        <button
          onClick={handleRefresh}
          disabled={isRefreshing || isLoading}
          className="p-3 bg-gradient-to-r from-gray-500/20 to-gray-500/20 hover:from-gray-500/30 hover:to-gray-500/30 border border-gray-500/30 rounded-lg text-gray-300 transition-all hover:scale-105 active:scale-[0.95] duration-200 disabled:opacity-50"
          title="Daten neu laden"
        >
          <RotateCw className={`w-5 h-5 ${isRefreshing ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Error Message */}
      {hasError && (
        <div className="flex gap-2 p-4 bg-red-500/10 border border-red-500/30 rounded-lg text-red-300 animate-in fade-in shake duration-300">
          <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
          <span className="text-sm">{subjectsError || gradesError}</span>
        </div>
      )}

      {/* Overall Average Card */}
      {!isLoading && (subjects.length > 0 || grades.length > 0) && overallAverage !== null && (
        <div className="p-6 bg-gradient-to-br from-blue-500/10 to-purple-500/10 border border-blue-500/20 rounded-xl animate-in slide-in-from-top-4 duration-300 delay-100">
          <div className="space-y-3">
            <p className="text-sm font-medium text-gray-400">Durchschnitt gesamt</p>
            <div className="flex items-baseline gap-3">
              <div className="text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-400">
                {overallAverage > 0 ? formatGrade(overallAverage) : '—'}
              </div>
              {overallAverage > 0 && (
                <span className="text-lg text-gray-400">{getGradeLabel(overallAverage)}</span>
              )}
            </div>
            <p className="text-xs text-gray-500">
              {subjects.length} Fach{subjects.length !== 1 ? 'er' : ''} • {grades.length} Note{grades.length !== 1 ? 'n' : ''}
            </p>
          </div>
        </div>
      )}

      {/* Loading State */}
      {isLoading ? (
        <div className="space-y-4 animate-in fade-in duration-300">
          {[1, 2, 3].map(i => (
            <div
              key={i}
              className="h-24 bg-white/5 border border-white/10 rounded-lg animate-pulse"
              style={{ animationDelay: `${i * 50}ms` }}
            />
          ))}
        </div>
      ) : subjects.length === 0 ? (
        <div className="text-center py-16 text-gray-400 animate-in fade-in zoom-in duration-300">
          <BookOpen className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p className="text-lg font-medium">Keine Fächer vorhanden</p>
          <p className="text-sm text-gray-500 mt-2">Füge dein erstes Fach in den Einstellungen hinzu</p>
        </div>
      ) : (
        <div className="space-y-6">
            <div className="space-y-3 animate-in slide-in-from-left duration-300 delay-150">
              <h2 className="text-sm font-semibold text-gray-300 uppercase tracking-wider px-1">
                Hauptfächer ({hauptfaecher.length})
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {hauptfaecher.map((subject, idx) => {
                  const subjectGrades = grades.filter(g => g.subject_id === subject.id);
                  const subjectAverage = calculateSubjectAverage(subjectGrades);

                  return (
                    <button
                      key={subject.id}
                      onClick={() => handleSelectSubject(subject.id)}
                      className="p-4 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 rounded-lg text-left transition-all group animate-in slide-in-from-left duration-300 hover:scale-[1.02] transform"
                      disabled={isTransitioning}
                      style={{ animationDelay: `${150 + idx * 75}ms` }}
                    >
                      <div className="flex items-start justify-between gap-3 mb-3">
                        <div className="flex items-center gap-3 flex-1">
                          <div
                            className="w-5 h-5 rounded-full flex-shrink-0 shadow-lg"
                            style={{ backgroundColor: subject.color }}
                          />
                          <span className="font-semibold text-white truncate text-base">
                            {subject.name}
                          </span>
                        </div>
                        <span
                          className={`text-lg font-bold flex-shrink-0 ${
                            subjectAverage && subjectAverage > 0
                              ? subjectAverage <= 2
                                ? 'text-green-400'
                                : subjectAverage <= 3.5
                                ? 'text-yellow-400'
                                : 'text-red-400'
                              : 'text-gray-500'
                          }`}
                        >
                          {subjectAverage && subjectAverage > 0 ? formatGrade(subjectAverage) : '—'}
                        </span>
                      </div>
                      <div className="flex items-center justify-between px-1">
                        <span className="text-xs text-gray-500">
                          {subjectGrades.length} Note{subjectGrades.length !== 1 ? 'n' : ''}
                        </span>
                        <span className="text-xs text-gray-400 font-medium group-hover:translate-x-1 transition-transform opacity-0 group-hover:opacity-100">
                          Öffnen →
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

          {/* Nebenfächer */}
          {nebenfaecher.length > 0 && (
            <div className="space-y-3 animate-in slide-in-from-left duration-300 delay-200">
              <h2 className="text-sm font-semibold text-gray-300 uppercase tracking-wider px-1">
                Nebenfächer ({nebenfaecher.length})
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {nebenfaecher.map((subject, idx) => {
                  const subjectGrades = grades.filter(g => g.subject_id === subject.id);
                  const subjectAverage = calculateSubjectAverage(subjectGrades);

                  return (
                    <button
                      key={subject.id}
                      onClick={() => handleSelectSubject(subject.id)}
                      className="p-4 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 rounded-lg text-left transition-all group animate-in slide-in-from-left duration-300 hover:scale-[1.02] transform"
                      disabled={isTransitioning}
                      style={{ animationDelay: `${200 + (hauptfaecher.length + idx) * 75}ms` }}
                    >
                      <div className="flex items-start justify-between gap-3 mb-3">
                        <div className="flex items-center gap-3 flex-1">
                          <div
                            className="w-5 h-5 rounded-full flex-shrink-0 shadow-lg"
                            style={{ backgroundColor: subject.color }}
                          />
                          <span className="font-semibold text-white truncate text-base">
                            {subject.name}
                          </span>
                        </div>
                        <span
                          className={`text-lg font-bold flex-shrink-0 ${
                            subjectAverage && subjectAverage > 0
                              ? subjectAverage <= 2
                                ? 'text-green-400'
                                : subjectAverage <= 3.5
                                ? 'text-yellow-400'
                                : 'text-red-400'
                              : 'text-gray-500'
                          }`}
                        >
                          {subjectAverage && subjectAverage > 0 ? formatGrade(subjectAverage) : '—'}
                        </span>
                      </div>
                      <div className="flex items-center justify-between px-1">
                        <span className="text-xs text-gray-500">
                          {subjectGrades.length} Note{subjectGrades.length !== 1 ? 'n' : ''}
                        </span>
                        <span className="text-xs text-gray-400 font-medium group-hover:translate-x-1 transition-transform opacity-0 group-hover:opacity-100">
                          Öffnen →
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

    </div>
  );
}
