'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Plus, Edit2, Trash2, BookOpen, AlertCircle, RotateCw } from 'lucide-react';
import { useSubjects, type Subject } from '@/lib/grades/hooks';
import AddSubjectDialog from './AddSubjectDialog';

interface EditState {
  isOpen: boolean;
  id?: string;
  name: string;
  type: 'HAUPTFACH' | 'NEBENFACH';
  color: string;
  default_room: string;
  default_teacher: string;
}

const COLOR_PRESETS = [
  '#ef4444', '#f97316', '#eab308', '#22c55e', '#14b8a6', '#3b82f6',
  '#f87171', '#fb923c', '#facc15', '#4ade80', '#2dd4bf', '#60a5fa',
  '#fca5a5', '#fbbd23', '#fde047', '#86efac', '#67e8f9', '#93c5fd',
  '#6366f1', '#8b5cf6', '#ec4899', '#818cf8', '#a78bfa', '#f472b6',
  '#000000', '#1f2937', '#4b5563', '#9ca3af', '#d1d5db', '#ffffff',
];

export default function SubjectListSettings() {
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [editState, setEditState] = useState<EditState>({
    isOpen: false,
    name: '',
    type: 'HAUPTFACH',
    color: '#3b82f6',
    default_room: '',
    default_teacher: '',
  });
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [isMounted, setIsMounted] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const { subjects, loading, error, fetchSubjects, addSubject, updateSubject, deleteSubject } = useSubjects();

  useEffect(() => {
    setIsMounted(true);
    return () => setIsMounted(false);
  }, []);

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

  const handleEditSubject = (subject: Subject) => {
    setEditState({
      isOpen: true,
      id: subject.id,
      name: subject.name,
      type: subject.type,
      color: subject.color,
      default_room: subject.default_room || '',
      default_teacher: subject.default_teacher || '',
    });
  };

  const handleSaveEdit = async () => {
    if (!editState.id || !editState.name.trim()) return;

    setIsSaving(true);
    try {
      await updateSubject(editState.id, {
        name: editState.name,
        type: editState.type,
        color: editState.color,
        default_room: editState.default_room,
        default_teacher: editState.default_teacher,
      });
      setEditState({
        isOpen: false,
        name: '',
        type: 'HAUPTFACH',
        color: '#3b82f6',
        default_room: '',
        default_teacher: '',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteSubject = async (id: string) => {
    setIsDeleting(true);
    try {
      await deleteSubject(id);
      setDeleteConfirmId(null);
    } finally {
      setIsDeleting(false);
    }
  };

  const hauptfaecher = subjects.filter(s => s.type === 'HAUPTFACH');
  const nebenfaecher = subjects.filter(s => s.type === 'NEBENFACH');

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 animate-in slide-in-from-top-2 duration-300">
        <div className="flex items-center gap-4 flex-1">
          <div className="p-3 bg-gradient-to-br from-blue-500/20 to-purple-500/20 rounded-lg">
            <BookOpen className="w-6 h-6 text-blue-400" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-white">Fächer verwalten</h3>
            <p className="text-sm text-gray-400">Erstelle und bearbeite deine Fächer</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleRefresh}
            disabled={isRefreshing || loading}
            className="p-3 bg-gradient-to-r from-gray-500/20 to-gray-500/20 hover:from-gray-500/30 hover:to-gray-500/30 border border-gray-500/30 rounded-lg text-gray-300 transition-all hover:scale-105 active:scale-[0.95] duration-200 disabled:opacity-50"
            title="Daten neu laden"
          >
            <RotateCw className={`w-5 h-5 ${isRefreshing ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={() => setShowAddDialog(true)}
            className="p-3 bg-gradient-to-r from-blue-500/20 to-purple-500/20 hover:from-blue-500/30 hover:to-purple-500/30 border border-blue-500/30 rounded-lg text-blue-300 transition-all hover:scale-105 active:scale-[0.95] duration-200"
          >
            <Plus className="w-6 h-6" />
          </button>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="flex gap-2 p-4 bg-red-500/10 border border-red-500/30 rounded-lg text-red-300 animate-in shake duration-300">
          <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
          <span className="text-sm">{error}</span>
        </div>
      )}

      {/* Loading State */}
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
        <div className="text-center py-12 text-gray-400 animate-in fade-in zoom-in duration-300">
          <BookOpen className="w-10 h-10 mx-auto mb-3 opacity-50" />
          <p className="text-base">Keine Fächer vorhanden</p>
          <p className="text-sm text-gray-500 mt-2">Füge dein erstes Fach hinzu</p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Hauptfächer */}
          {hauptfaecher.length > 0 && (
            <div className="space-y-3 animate-in slide-in-from-left duration-300 delay-100">
              <h4 className="text-sm font-semibold text-gray-300 uppercase tracking-wider px-1">
                Hauptfächer ({hauptfaecher.length})
              </h4>
              <div className="space-y-3">
                {hauptfaecher.map((subject, idx) => (
                  <div
                    key={subject.id}
                    className="p-4 bg-white/5 border border-white/10 rounded-lg hover:bg-white/10 transition-all group animate-in slide-in-from-left duration-300 hover:scale-[1.01]"
                    style={{ animationDelay: `${100 + idx * 50}ms` }}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3 flex-1">
                        <div
                          className="w-5 h-5 rounded-full flex-shrink-0 shadow-lg"
                          style={{ backgroundColor: subject.color }}
                        />
                        <span className="text-base font-medium text-white truncate">
                          {subject.name}
                        </span>
                      </div>
                      <div className="flex gap-2 opacity-100 [@media(hover:hover)]:opacity-0 [@media(hover:hover)]:group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => handleEditSubject(subject)}
                          className="p-2 hover:bg-blue-500/20 rounded text-blue-300 transition-all hover:scale-110 hover:-translate-y-0.5 duration-200"
                          title="Bearbeiten"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setDeleteConfirmId(subject.id)}
                          className="p-2 hover:bg-red-500/20 rounded text-red-300 transition-colors hover:scale-110 duration-200"
                          title="Löschen"
                        >
                          <Trash2 className="w-4 h-4" />
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
            <div className="space-y-3 animate-in slide-in-from-left duration-300 delay-150">
              <h4 className="text-sm font-semibold text-gray-300 uppercase tracking-wider px-1">
                Nebenfächer ({nebenfaecher.length})
              </h4>
              <div className="space-y-3">
                {nebenfaecher.map((subject, idx) => (
                  <div
                    key={subject.id}
                    className="p-4 bg-white/5 border border-white/10 rounded-lg hover:bg-white/10 transition-all group animate-in slide-in-from-left duration-300 hover:scale-[1.01]"
                    style={{ animationDelay: `${150 + (hauptfaecher.length + idx) * 50}ms` }}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3 flex-1">
                        <div
                          className="w-5 h-5 rounded-full flex-shrink-0 shadow-lg"
                          style={{ backgroundColor: subject.color }}
                        />
                        <span className="text-base font-medium text-white truncate">
                          {subject.name}
                        </span>
                      </div>
                      <div className="flex gap-2 opacity-100 [@media(hover:hover)]:opacity-0 [@media(hover:hover)]:group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => handleEditSubject(subject)}
                          className="p-2 hover:bg-blue-500/20 rounded text-blue-300 transition-all hover:scale-110 hover:-translate-y-0.5 duration-200"
                          title="Bearbeiten"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setDeleteConfirmId(subject.id)}
                          className="p-2 hover:bg-red-500/20 rounded text-red-300 transition-colors hover:scale-110 duration-200"
                          title="Löschen"
                        >
                          <Trash2 className="w-4 h-4" />
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

      {/* Add Subject Dialog */}
      <AddSubjectDialog
        isOpen={showAddDialog}
        onClose={() => setShowAddDialog(false)}
        onAdd={async (name, type, color, defaultRoom, defaultTeacher) => {
          await addSubject(name, type, color, defaultRoom, defaultTeacher);
        }}
      />

      {/* Edit Dialog */}
      {editState.isOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 modal-backdrop-animate">
          <div className="bg-gradient-to-br from-[#1a1a1a] to-[#0d0d0d] rounded-2xl shadow-2xl p-7 max-w-md w-full border border-white/5 max-h-[90vh] overflow-y-auto modal-animate">
            <h2 className="text-xl sm:text-2xl font-bold text-white mb-6 modal-field-1">
              Fach bearbeiten
            </h2>

            <div className="space-y-5 mb-6">
              <div className="modal-field-2">
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Fächername
                </label>
                <input
                  type="text"
                  value={editState.name}
                  onChange={(e) => setEditState({ ...editState, name: e.target.value })}
                  className="w-full text-base bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/25 transition-all"
                  disabled={isSaving}
                />
              </div>

              <div className="modal-field-3">
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Fachtyp
                </label>
                <div className="grid grid-cols-2 gap-3">
                  {['HAUPTFACH', 'NEBENFACH'].map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setEditState({ ...editState, type: t as 'HAUPTFACH' | 'NEBENFACH' })}
                      className={`py-3 px-4 rounded-lg font-medium text-sm transition-all border transform hover:scale-105 active:scale-[0.95] duration-200 ${
                        editState.type === t
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

              <div className="modal-field-4">
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Standard-Raum
                </label>
                <input
                  type="text"
                  value={editState.default_room}
                  onChange={(e) => setEditState({ ...editState, default_room: e.target.value })}
                  className="w-full text-base bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/25 transition-all"
                  disabled={isSaving}
                  placeholder="z.B. B204"
                />
              </div>

              <div className="modal-field-5">
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Standard-Lehrkraft
                </label>
                <input
                  type="text"
                  value={editState.default_teacher}
                  onChange={(e) => setEditState({ ...editState, default_teacher: e.target.value })}
                  className="w-full text-base bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/25 transition-all"
                  disabled={isSaving}
                  placeholder="z.B. Frau Müller"
                />
              </div>

              <div className="modal-field-6">
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Farbe
                </label>
                <div className="grid grid-cols-6 gap-2">
                  {COLOR_PRESETS.map((c, idx) => (
                    <button
                      key={c}
                      onClick={() => setEditState({ ...editState, color: c })}
                      className={`aspect-square rounded-lg border-2 transition-all transform animate-in zoom-in-75 ${
                        editState.color === c
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

            <div className="flex gap-3 flex-col sm:flex-row modal-buttons-animate">
              <button
                onClick={() =>
                  setEditState({
                    isOpen: false,
                    name: '',
                    type: 'HAUPTFACH',
                    color: '#3b82f6',
                    default_room: '',
                    default_teacher: '',
                  })
                }
                className="flex-1 px-4 py-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-gray-300 font-medium text-base transition-all transform hover:scale-[1.02] active:scale-[0.98] duration-200"
                disabled={isSaving}
              >
                Abbrechen
              </button>
              <button
                onClick={handleSaveEdit}
                className="flex-1 px-4 py-3 bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 rounded-lg text-white font-medium text-base transition-all disabled:opacity-50 transform hover:scale-[1.02] active:scale-[0.98] duration-200"
                disabled={isSaving || !editState.name.trim()}
              >
                {isSaving ? 'Speichern...' : 'Speichern'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation */}
      {deleteConfirmId && isMounted && createPortal(
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[80] modal-backdrop-animate">
          <div className="bg-gradient-to-b from-[#1a1a1a] to-[#0f0f0f] border border-white/10 rounded-2xl p-6 max-w-md w-full mx-4 modal-animate">
            <h2 className="text-xl font-semibold mb-3">Fach löschen?</h2>
            <p className="text-gray-300 leading-relaxed">
              Dadurch werden auch alle zugehörigen Noten gelöscht. Diese Aktion kann nicht rückgängig gemacht werden.
            </p>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => {
                  if (isDeleting) return;
                  setDeleteConfirmId(null);
                }}
                disabled={isDeleting}
                className="flex-1 py-2.5 rounded-lg bg-white/10 hover:bg-white/20 border border-white/20 transition-all disabled:opacity-60"
              >
                Abbrechen
              </button>
              <button
                onClick={() => deleteConfirmId && handleDeleteSubject(deleteConfirmId)}
                className="flex-1 py-2.5 rounded-lg transition-all disabled:opacity-60 bg-red-500/80 hover:bg-red-500 text-white"
                disabled={isDeleting}
              >
                {isDeleting ? 'Bitte warten...' : 'Löschen'}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
