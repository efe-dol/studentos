'use client';

import { useEffect, useState } from 'react';
import { Plus, Edit2, Trash2, BookOpen, AlertCircle, ChevronRight, RotateCw } from 'lucide-react';
import { useSubjects } from '@/lib/grades/hooks';
import AddSubjectDialog from './AddSubjectDialog';

interface SubjectListSettingsProps {
  onClose?: () => void;
}

export default function SubjectListSettings({ onClose }: SubjectListSettingsProps) {
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [editingSubject, setEditingSubject] = useState<any>(null);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [editName, setEditName] = useState('');
  const [editType, setEditType] = useState<'HAUPTFACH' | 'NEBENFACH'>('HAUPTFACH');
  const [editColor, setEditColor] = useState('#3b82f6');
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isCleaningUp, setIsCleaningUp] = useState(false);

  const { subjects, loading, error, fetchSubjects, addSubject, updateSubject, deleteSubject, cleanupInvalidSubjects } =
    useSubjects();

  useEffect(() => {
    fetchSubjects();
  }, [fetchSubjects]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await fetchSubjects();
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleCleanup = async () => {
    setIsCleaningUp(true);
    try {
      const result = await cleanupInvalidSubjects();
      console.log('Cleanup result:', result);
    } catch (err) {
      console.error('Cleanup error:', err);
    } finally {
      setIsCleaningUp(false);
    }
  };

  const handleEditSubject = (subject: any) => {
    setEditingSubject(subject);
    setEditName(subject.name);
    setEditType(subject.type);
    setEditColor(subject.color);
    setShowEditDialog(true);
  };

  const handleSaveEdit = async () => {
    if (!editingSubject || !editName.trim()) return;

    setIsSaving(true);
    try {
      await updateSubject(editingSubject.id, {
        name: editName,
        type: editType,
        color: editColor,
      } as any);
      setShowEditDialog(false);
      setEditingSubject(null);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteSubject = async (id: string) => {
    setIsDeleting(true);
    try {
      await deleteSubject(id);
      console.log('Subject deleted successfully');
      setDeleteConfirm(null);
    } catch (err) {
      console.error('Delete failed:', err);
      // Error is already set in the hook
    } finally {
      setIsDeleting(false);
    }
  };

  const hauptfaecher = subjects.filter(s => s.type === 'HAUPTFACH');
  const nebenfaecher = subjects.filter(s => s.type === 'NEBENFACH');

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-4 flex-1 min-w-0">
          <div className="p-3 bg-gradient-to-br from-blue-500/20 to-purple-500/20 rounded-lg flex-shrink-0">
            <BookOpen className="w-6 h-6 text-blue-400" />
          </div>
          <div className="min-w-0">
            <h3 className="text-xl font-bold text-white">Fächer verwalten</h3>
            <p className="text-sm text-gray-400">Erstelle und bearbeite deine Fächer</p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <button
            onClick={handleRefresh}
            disabled={isRefreshing || loading}
            className="p-3 bg-gradient-to-r from-gray-500/20 to-gray-500/20 hover:from-gray-500/30 hover:to-gray-500/30 border border-gray-500/30 rounded-lg text-gray-300 transition-all flex-shrink-0 disabled:opacity-50"
            title="Daten neu laden"
          >
            <RotateCw className={`w-5 h-5 ${isRefreshing ? 'animate-spin' : ''}`} />
          </button>
          {subjects.length > 0 && (
            <button
              onClick={handleCleanup}
              disabled={isCleaningUp || loading}
              className="px-3 py-2.5 bg-gradient-to-r from-amber-500/20 to-orange-500/20 hover:from-amber-500/30 hover:to-orange-500/30 border border-amber-500/30 rounded-lg text-amber-300 text-xs font-medium transition-all flex-shrink-0 disabled:opacity-50"
              title="Probleme beheben"
            >
              {isCleaningUp ? 'Repariere...' : 'Reparieren'}
            </button>
          )}
          <button
            onClick={() => setShowAddDialog(true)}
            className="p-3 bg-gradient-to-r from-blue-500/20 to-purple-500/20 hover:from-blue-500/30 hover:to-purple-500/30 border border-blue-500/30 rounded-lg text-blue-300 transition-all flex-shrink-0"
          >
            <Plus className="w-6 h-6" />
          </button>
        </div>
      </div>

      {error && (
        <div className="flex gap-2 p-4 bg-red-500/10 border border-red-500/30 rounded-lg text-red-300 text-base animate-in shake duration-300">
          <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
          <span className="text-sm sm:text-base">{error}</span>
        </div>
      )}

      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map(i => (
            <div
              key={i}
              className="h-16 bg-white/5 border border-white/10 rounded-lg animate-pulse"
            />
          ))}
        </div>
      ) : subjects.length === 0 ? (
        <div className="text-center py-12 text-gray-400">
          <BookOpen className="w-10 h-10 mx-auto mb-3 opacity-50" />
          <p className="text-base">Keine Fächer vorhanden</p>
        </div>
      ) : (
        <div className="space-y-5">
          {/* Hauptfächer */}
          {hauptfaecher.length > 0 && (
            <div className="space-y-3">
              <h4 className="text-sm font-semibold text-gray-300 uppercase tracking-wider px-1">
                Hauptfächer ({hauptfaecher.length})
              </h4>
              <div className="space-y-3">
                {hauptfaecher.map((subject, idx) => (
                  <div
                    key={subject.id}
                    className="p-4 bg-white/5 border border-white/10 rounded-lg hover:bg-white/10 transition-all group animate-in slide-in-from-left duration-300"
                    style={{ animationDelay: `${idx * 50}ms` }}
                  >
                    <div className="flex items-center justify-between gap-3 sm:gap-4">
                      <div className="flex items-center gap-3 sm:gap-4 flex-1 min-w-0">
                        <div
                          className="w-5 h-5 sm:w-6 sm:h-6 rounded-full flex-shrink-0"
                          style={{ backgroundColor: subject.color }}
                        />
                        <span className="text-base font-medium text-white truncate">
                          {subject.name}
                        </span>
                      </div>
                      <div className="flex gap-2 sm:gap-3 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                        <button
                          onClick={() => handleEditSubject(subject)}
                          className="p-2 sm:p-2.5 hover:bg-blue-500/20 rounded text-blue-300 transition-colors"
                          title="Bearbeiten"
                        >
                          <Edit2 className="w-5 h-5" />
                        </button>
                        <button
                          onClick={() => setDeleteConfirm(subject.id)}
                          className="p-2 sm:p-2.5 hover:bg-red-500/20 rounded text-red-300 transition-colors"
                          title="Löschen"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Nebenfächer */}
          {nebenfaecher.length > 0 && (
            <div className="space-y-3">
              <h4 className="text-sm font-semibold text-gray-300 uppercase tracking-wider px-1">
                Nebenfächer ({nebenfaecher.length})
              </h4>
              <div className="space-y-3">
                {nebenfaecher.map((subject, idx) => (
                  <div
                    key={subject.id}
                    className="p-4 bg-white/5 border border-white/10 rounded-lg hover:bg-white/10 transition-all group animate-in slide-in-from-left duration-300"
                    style={{ animationDelay: `${(hauptfaecher.length + idx) * 50}ms` }}
                  >
                    <div className="flex items-center justify-between gap-3 sm:gap-4">
                      <div className="flex items-center gap-3 sm:gap-4 flex-1 min-w-0">
                        <div
                          className="w-5 h-5 sm:w-6 sm:h-6 rounded-full flex-shrink-0"
                          style={{ backgroundColor: subject.color }}
                        />
                        <span className="text-base font-medium text-white truncate">
                          {subject.name}
                        </span>
                      </div>
                      <div className="flex gap-2 sm:gap-3 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                        <button
                          onClick={() => handleEditSubject(subject)}
                          className="p-2 sm:p-2.5 hover:bg-blue-500/20 rounded text-blue-300 transition-colors"
                          title="Bearbeiten"
                        >
                          <Edit2 className="w-5 h-5" />
                        </button>
                        <button
                          onClick={() => setDeleteConfirm(subject.id)}
                          className="p-2 sm:p-2.5 hover:bg-red-500/20 rounded text-red-300 transition-colors"
                          title="Löschen"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Add Dialog */}
      <AddSubjectDialog
        isOpen={showAddDialog}
        onClose={() => setShowAddDialog(false)}
        onAdd={addSubject}
      />

      {/* Edit Dialog */}
      {showEditDialog && editingSubject && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
          <div className="bg-gradient-to-br from-[#1a1a1a] to-[#0d0d0d] rounded-2xl shadow-2xl p-7 max-w-md w-full border border-white/5 max-h-[90vh] overflow-y-auto animate-in fade-in zoom-in-95 duration-300">
            <h2 className="text-xl sm:text-2xl font-bold text-white mb-6 animate-in fade-in slide-in-from-top-4 duration-300">Fach bearbeiten</h2>

            <div className="space-y-5 mb-6">
              <div className="animate-in fade-in slide-in-from-left-4 duration-300 delay-100">
                <label className="block text-sm sm:text-base font-medium text-gray-300 mb-2">
                  Fächername
                </label>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full text-base bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/25 transition-all transform hover:scale-[1.01] duration-200"
                  disabled={isSaving}
                />
              </div>

              <div className="animate-in fade-in slide-in-from-left-4 duration-300 delay-150">
                <label className="block text-sm sm:text-base font-medium text-gray-300 mb-2">
                  Fachtyp
                </label>
                <div className="grid grid-cols-2 gap-3">
                  {['HAUPTFACH', 'NEBENFACH'].map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setEditType(t as 'HAUPTFACH' | 'NEBENFACH')}
                      className={`py-3 px-4 rounded-lg font-medium text-sm transition-all border transform hover:scale-105 active:scale-[0.95] duration-200 ${
                        editType === t
                          ? 'bg-gradient-to-r from-blue-500/20 to-purple-500/20 border-blue-500/50 text-blue-200'
                          : 'bg-white/5 border-white/10 text-gray-400 hover:bg-white/10'
                      }`}
                      disabled={isSaving}
                    >
                      {t === 'HAUPTFACH' ? 'Hauptfach' : 'Nebenfach'}
                    </button>
                  ))}
                </div>
              </div>

              <div className="animate-in fade-in slide-in-from-left-4 duration-300 delay-200">
                <label className="block text-sm sm:text-base font-medium text-gray-300 mb-2">
                  Farbe
                </label>
                <div className="grid grid-cols-6 gap-2">
                  {[
                    '#ef4444', '#f97316', '#eab308', '#22c55e', '#14b8a6', '#3b82f6',
                    '#f87171', '#fb923c', '#facc15', '#4ade80', '#2dd4bf', '#60a5fa',
                    '#fca5a5', '#fbbd23', '#fde047', '#86efac', '#67e8f9', '#93c5fd',
                    '#6366f1', '#8b5cf6', '#ec4899', '#818cf8', '#a78bfa', '#f472b6',
                  ].map((c, idx) => (
                    <button
                      key={c}
                      onClick={() => setEditColor(c)}
                      className={`aspect-square rounded-lg border-2 transition-all transform animate-in zoom-in-75 ${
                        editColor === c
                          ? 'border-white scale-110 shadow-lg shadow-white/20'
                          : 'border-transparent hover:scale-105'
                      }`}
                      style={{
                        backgroundColor: c,
                        animationDelay: `${200 + (idx % 6) * 20}ms`,
                      }}
                      disabled={isSaving}
                    />
                  ))}
                </div>
              </div>
            </div>

            <div className="flex gap-3 flex-col sm:flex-row animate-in fade-in slide-in-from-bottom-4 duration-300 delay-300">
              <button
                onClick={() => setShowEditDialog(false)}
                className="flex-1 px-4 py-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-gray-300 font-medium text-base transition-all transform hover:scale-[1.02] active:scale-[0.98] duration-200"
                disabled={isSaving}
              >
                Abbrechen
              </button>
              <button
                onClick={handleSaveEdit}
                className="flex-1 px-4 py-3 bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 rounded-lg text-white font-medium text-base transition-all disabled:opacity-50 transform hover:scale-[1.02] active:scale-[0.98] duration-200"
                disabled={isSaving || !editName.trim()}
              >
                {isSaving ? 'Speichern...' : 'Speichern'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
          <div className="bg-gradient-to-br from-[#1a1a1a] to-[#0d0d0d] rounded-2xl shadow-2xl p-7 max-w-sm w-full border border-white/5 animate-in fade-in zoom-in-95 duration-300">
            <h2 className="text-xl sm:text-2xl font-bold text-white mb-3 animate-in fade-in slide-in-from-top-4 duration-300">Fach löschen?</h2>
            <p className="text-sm sm:text-base text-gray-400 mb-6 animate-in fade-in slide-in-from-left-4 duration-300 delay-100">
              Dadurch werden auch alle zugehörigen Noten gelöscht. Diese Aktion kann nicht rückgängig
              gemacht werden.
            </p>

            <div className="flex gap-3 flex-col sm:flex-row animate-in fade-in slide-in-from-bottom-4 duration-300 delay-200">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="flex-1 px-4 py-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-gray-300 font-medium text-base transition-all transform hover:scale-[1.02] active:scale-[0.98] duration-200"
                disabled={isDeleting}
              >
                Abbrechen
              </button>
              <button
                onClick={() => handleDeleteSubject(deleteConfirm)}
                className="flex-1 px-4 py-3 bg-red-500 hover:bg-red-600 rounded-lg text-white font-medium text-base transition-all disabled:opacity-50 transform hover:scale-[1.02] active:scale-[0.98] duration-200"
                disabled={isDeleting}
              >
                {isDeleting ? 'Löschen...' : 'Löschen'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
