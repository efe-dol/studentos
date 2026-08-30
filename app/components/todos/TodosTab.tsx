'use client';

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import Toast from '@/app/components/common/Toast';
import Select from '@/app/components/common/Select';
import { CheckSquare, Plus, Trash2, Edit as EditIcon, X, AlertCircle } from 'lucide-react';

const PRIORITY_OPTIONS = [
  { value: 'low', label: 'Niedrig' },
  { value: 'medium', label: 'Mittel' },
  { value: 'high', label: 'Hoch' },
  { value: 'urgent', label: 'Dringend' },
];

type Todo = {
  id: string;
  title: string;
  description: string | null;
  due_date: string | null;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  is_completed: boolean;
  created_at: string;
  updated_at: string;
};

const isAbortError = (error: unknown) =>
  error instanceof DOMException && error.name === 'AbortError';

const priorityColor = (priority: string) => {
  switch (priority) {
    case 'urgent':
      return 'bg-red-500/20 border-red-500/50 text-red-400';
    case 'high':
      return 'bg-orange-500/20 border-orange-500/50 text-orange-400';
    case 'medium':
      return 'bg-yellow-500/20 border-yellow-500/50 text-yellow-400';
    case 'low':
      return 'bg-green-500/20 border-green-500/50 text-green-400';
    default:
      return 'bg-gray-500/20 border-gray-500/50 text-gray-400';
  }
};

const priorityLabel = (priority: string) =>
  ({ urgent: 'Dringend', high: 'Hoch', medium: 'Mittel', low: 'Niedrig' } as Record<string, string>)[priority] || priority;

const formatDate = (dateString: string | null) => {
  if (!dateString) return null;
  return new Date(dateString).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' });
};

const isOverdue = (dateString: string | null) => (dateString ? new Date(dateString) < new Date() : false);

export default function TodosTab({ onChange }: { onChange?: () => void }) {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingTodo, setEditingTodo] = useState<Todo | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [isMounted, setIsMounted] = useState(false);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [priority, setPriority] = useState<Todo['priority']>('medium');
  const [saving, setSaving] = useState(false);

  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  useEffect(() => {
    setIsMounted(true);
    return () => setIsMounted(false);
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    (async () => {
      try {
        const response = await fetch('/api/todos', { signal: controller.signal });
        if (!response.ok) throw new Error('Failed to fetch todos');
        const data = await response.json();
        setTodos(data.todos || []);
      } catch (error) {
        if (isAbortError(error)) return;
        setToast({ message: 'Fehler beim Laden der ToDos', type: 'error' });
      } finally {
        setLoading(false);
      }
    })();
    return () => controller.abort();
  }, []);

  const resetForm = () => {
    setTitle('');
    setDescription('');
    setDueDate('');
    setPriority('medium');
  };

  const notifyChange = () => onChangeRef.current?.();

  const handleAddTodo = async () => {
    if (!title.trim()) {
      setToast({ message: 'Bitte einen Titel eingeben', type: 'error' });
      return;
    }
    setSaving(true);
    try {
      const response = await fetch('/api/todos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim() || null,
          due_date: dueDate || null,
          priority,
        }),
      });
      if (!response.ok) throw new Error('Failed to create todo');
      const data = await response.json();
      setTodos((prev) => [data.todo, ...prev]);
      setShowAddModal(false);
      resetForm();
      notifyChange();
      setToast({ message: 'ToDo erstellt', type: 'success' });
    } catch {
      setToast({ message: 'Fehler beim Erstellen des ToDos', type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const handleEditTodo = async () => {
    if (!editingTodo || !title.trim()) {
      setToast({ message: 'Bitte einen Titel eingeben', type: 'error' });
      return;
    }
    setSaving(true);
    try {
      const response = await fetch(`/api/todos/${editingTodo.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim() || null,
          due_date: dueDate || null,
          priority,
        }),
      });
      if (!response.ok) throw new Error('Failed to update todo');
      const data = await response.json();
      setTodos((prev) => prev.map((t) => (t.id === editingTodo.id ? data.todo : t)));
      setShowEditModal(false);
      setEditingTodo(null);
      resetForm();
      notifyChange();
      setToast({ message: 'ToDo aktualisiert', type: 'success' });
    } catch {
      setToast({ message: 'Fehler beim Aktualisieren des ToDos', type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const handleToggleComplete = async (todo: Todo) => {
    const optimistic = { ...todo, is_completed: !todo.is_completed };
    setTodos((prev) => prev.map((t) => (t.id === todo.id ? optimistic : t)));
    try {
      const response = await fetch(`/api/todos/${todo.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_completed: !todo.is_completed }),
      });
      if (!response.ok) throw new Error('Failed to update todo');
      const data = await response.json();
      setTodos((prev) => prev.map((t) => (t.id === todo.id ? data.todo : t)));
      notifyChange();
    } catch {
      setTodos((prev) => prev.map((t) => (t.id === todo.id ? todo : t)));
      setToast({ message: 'Fehler beim Aktualisieren', type: 'error' });
    }
  };

  const handleDeleteTodo = async (id: string) => {
    try {
      const response = await fetch(`/api/todos/${id}`, { method: 'DELETE' });
      if (!response.ok) throw new Error('Failed to delete todo');
      setTodos((prev) => prev.filter((t) => t.id !== id));
      setDeleteConfirmId(null);
      notifyChange();
      setToast({ message: 'ToDo gelöscht', type: 'success' });
    } catch {
      setToast({ message: 'Fehler beim Löschen', type: 'error' });
    }
  };

  const openEditModal = (todo: Todo) => {
    setEditingTodo(todo);
    setTitle(todo.title);
    setDescription(todo.description || '');
    setDueDate(todo.due_date ? new Date(todo.due_date).toISOString().split('T')[0] : '');
    setPriority(todo.priority);
    setShowEditModal(true);
  };

  const incompleteTodos = todos.filter((t) => !t.is_completed);
  const completedTodos = todos.filter((t) => t.is_completed);

  const modalShell = (heading: string, onCloseModal: () => void, onSubmit: () => void, submitLabel: string) => (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[70] modal-backdrop-animate">
      <div className="bg-gradient-to-b from-[#1a1a1a] to-[#0f0f0f] border border-white/10 rounded-2xl p-8 max-w-md w-full mx-4 max-h-[90vh] overflow-y-auto modal-animate">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-semibold">{heading}</h2>
          <button onClick={onCloseModal} className="p-2 rounded-lg hover:bg-white/10 transition-all hover:scale-110">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-4">
          <div className="field modal-field-1">
            <input
              className="focus-glow px-4 py-3 rounded-xl text-white placeholder-transparent w-full"
              type="text"
              placeholder=" "
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
            <label>Titel *</label>
          </div>
          <div className="field modal-field-2">
            <textarea
              className="focus-glow px-4 py-3 rounded-xl text-white placeholder-transparent w-full min-h-[100px]"
              placeholder=" "
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
            <label>Beschreibung</label>
          </div>
          <div className="field modal-field-3">
            <input
              className="focus-glow px-4 py-3 rounded-xl text-white placeholder-transparent w-full"
              type="date"
              placeholder=" "
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
            />
            <label>Fälligkeitsdatum</label>
          </div>
          <div className="modal-field-4">
            <label className="block text-sm text-gray-300 mb-1.5">Priorität</label>
            <Select
              value={priority}
              onChange={(v) => setPriority(v as Todo['priority'])}
              options={PRIORITY_OPTIONS}
              ariaLabel="Priorität"
            />
          </div>
        </div>

        <div className="flex gap-3 mt-6 modal-buttons-animate">
          <button
            onClick={onCloseModal}
            className="flex-1 py-2 rounded-lg bg-white/10 hover:bg-white/20 border border-white/20 transition-all hover:scale-105"
          >
            Abbrechen
          </button>
          <button
            onClick={onSubmit}
            disabled={saving}
            className="flex-1 py-2 rounded-lg bg-blue-500 hover:bg-blue-600 transition-all disabled:opacity-50 hover:scale-105 hover:shadow-lg hover:shadow-blue-500/50"
          >
            {saving ? 'Speichern...' : submitLabel}
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="content-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6 card-stagger-1">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-gradient-to-br from-blue-500/20 to-purple-500/20 rounded-lg">
            <CheckSquare className="w-6 h-6 text-blue-400" />
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-white">ToDos</h1>
            <p className="text-sm text-gray-400">
              {incompleteTodos.length} offen, {completedTodos.length} erledigt
            </p>
          </div>
        </div>
        <button
          onClick={() => {
            resetForm();
            setShowAddModal(true);
          }}
          className="w-full sm:w-auto px-4 py-2 rounded-lg bg-blue-500 hover:bg-blue-600 transition-all flex items-center justify-center gap-2 font-medium hover:scale-105 hover:shadow-lg hover:shadow-blue-500/50"
        >
          <Plus className="w-5 h-5" />
          Neues ToDo
        </button>
      </div>

      {loading ? (
        <div className="space-y-3 card-stagger-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-20 bg-white/5 border border-white/10 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : (
        <>
          <div className="mb-8 card-stagger-2">
            <h2 className="text-xl font-semibold mb-4">Offen</h2>
            {incompleteTodos.length === 0 ? (
              <div className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-2xl p-8 text-center content-fade-in">
                <p className="text-gray-400">Keine offenen ToDos. Erstelle ein neues!</p>
              </div>
            ) : (
              <div className="space-y-3">
                {incompleteTodos.map((todo, index) => (
                  <div
                    key={todo.id}
                    className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-xl p-4 hover:bg-white/10 transition-all appointment-item-animate"
                    style={{ animationDelay: `${Math.min(index * 50, 400)}ms` }}
                  >
                    <div className="flex items-start gap-4">
                      <input
                        type="checkbox"
                        checked={todo.is_completed}
                        onChange={() => handleToggleComplete(todo)}
                        className="mt-1 w-5 h-5 cursor-pointer"
                      />
                      <div className="flex-1 min-w-0">
                        <h3 className="text-lg font-medium break-words">{todo.title}</h3>
                        {todo.description && <p className="text-sm text-gray-400 mt-1 break-words">{todo.description}</p>}
                        <div className="flex items-center gap-3 mt-2 flex-wrap">
                          <span className={`px-2 py-1 rounded text-xs border ${priorityColor(todo.priority)}`}>
                            {priorityLabel(todo.priority)}
                          </span>
                          {todo.due_date && (
                            <span
                              className={`text-xs flex items-center gap-1 ${
                                isOverdue(todo.due_date) ? 'text-red-400' : 'text-gray-400'
                              }`}
                            >
                              {isOverdue(todo.due_date) && <AlertCircle className="w-4 h-4" />}
                              Fällig: {formatDate(todo.due_date)}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => openEditModal(todo)}
                          className="p-2 rounded-lg hover:bg-white/10 transition-all border border-white/10 hover:scale-110"
                        >
                          <EditIcon className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setDeleteConfirmId(todo.id)}
                          className="p-2 rounded-lg hover:bg-red-500/20 transition-all border border-white/10 hover:scale-110"
                        >
                          <Trash2 className="w-4 h-4 text-red-400" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {completedTodos.length > 0 && (
            <div className="card-stagger-3">
              <h2 className="text-xl font-semibold mb-4">Erledigt</h2>
              <div className="space-y-3">
                {completedTodos.map((todo) => (
                  <div
                    key={todo.id}
                    className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-xl p-4 opacity-60 hover:opacity-80 transition-all"
                  >
                    <div className="flex items-start gap-4">
                      <input
                        type="checkbox"
                        checked={todo.is_completed}
                        onChange={() => handleToggleComplete(todo)}
                        className="mt-1 w-5 h-5 cursor-pointer"
                      />
                      <div className="flex-1 min-w-0">
                        <h3 className="text-lg font-medium line-through break-words">{todo.title}</h3>
                        {todo.description && (
                          <p className="text-sm text-gray-400 mt-1 line-through break-words">{todo.description}</p>
                        )}
                      </div>
                      <button
                        onClick={() => setDeleteConfirmId(todo.id)}
                        className="p-2 rounded-lg hover:bg-red-500/20 transition-all border border-white/10"
                      >
                        <Trash2 className="w-4 h-4 text-red-400" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {showAddModal &&
        modalShell('Neues ToDo', () => setShowAddModal(false), handleAddTodo, 'Erstellen')}

      {showEditModal &&
        modalShell(
          'ToDo bearbeiten',
          () => {
            setShowEditModal(false);
            setEditingTodo(null);
            resetForm();
          },
          handleEditTodo,
          'Aktualisieren'
        )}

      {deleteConfirmId && isMounted &&
        createPortal(
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[80] modal-backdrop-animate">
            <div className="bg-gradient-to-b from-[#1a1a1a] to-[#0f0f0f] border border-white/10 rounded-2xl p-6 max-w-md w-full mx-4 modal-animate">
              <h2 className="text-xl font-semibold mb-3">ToDo löschen?</h2>
              <p className="text-gray-300 leading-relaxed">Möchtest du dieses ToDo wirklich löschen?</p>
              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => setDeleteConfirmId(null)}
                  className="flex-1 py-2.5 rounded-lg bg-white/10 hover:bg-white/20 border border-white/20 transition-all"
                >
                  Abbrechen
                </button>
                <button
                  onClick={() => handleDeleteTodo(deleteConfirmId)}
                  className="flex-1 py-2.5 rounded-lg bg-red-500/80 hover:bg-red-500 text-white transition-all"
                >
                  Löschen
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}

      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
}
