'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import AuthBackground from '@/app/components/common/AuthBackground';
import LoadingScreen from '@/app/components/common/LoadingScreen';
import Toast from '@/app/components/common/Toast';
import { CheckSquare, Plus, Trash2, Edit as EditIcon, X, AlertCircle, ArrowLeft } from 'lucide-react';

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

export default function TodosPage() {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingTodo, setEditingTodo] = useState<Todo | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  
  // Form fields
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [priority, setPriority] = useState<'low' | 'medium' | 'high' | 'urgent'>('medium');
  const [saving, setSaving] = useState(false);

  const supabase = createClient();
  const router = useRouter();

  const isAbortError = (error: unknown) => {
    return error instanceof DOMException && error.name === 'AbortError';
  };

  const fetchTodos = async (signal?: AbortSignal) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push('/login');
        return;
      }

      const response = await fetch('/api/todos', { signal });
      if (!response.ok) {
        throw new Error('Failed to fetch todos');
      }

      const data = await response.json();
      setTodos(data.todos || []);
      setLoading(false);
    } catch (error) {
      if (isAbortError(error)) return;
      console.error('Error fetching todos:', error);
      setToast({ message: 'Fehler beim Laden der ToDos', type: 'error' });
      setLoading(false);
    }
  };

  useEffect(() => {
    const controller = new AbortController();
    fetchTodos(controller.signal);
    return () => controller.abort();
  }, []);

  const resetForm = () => {
    setTitle('');
    setDescription('');
    setDueDate('');
    setPriority('medium');
  };

  const handleAddTodo = async () => {
    if (!title.trim()) {
      setToast({ message: 'Bitte geben Sie einen Titel ein', type: 'error' });
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

      if (!response.ok) {
        throw new Error('Failed to create todo');
      }

      const data = await response.json();
      setTodos([data.todo, ...todos]);
      setShowAddModal(false);
      resetForm();
      setToast({ message: 'ToDo erfolgreich erstellt!', type: 'success' });
    } catch (error) {
      console.error('Error creating todo:', error);
      setToast({ message: 'Fehler beim Erstellen des ToDos', type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const handleEditTodo = async () => {
    if (!editingTodo) return;
    if (!title.trim()) {
      setToast({ message: 'Bitte geben Sie einen Titel ein', type: 'error' });
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

      if (!response.ok) {
        throw new Error('Failed to update todo');
      }

      const data = await response.json();
      setTodos(todos.map(t => t.id === editingTodo.id ? data.todo : t));
      setShowEditModal(false);
      setEditingTodo(null);
      resetForm();
      setToast({ message: 'ToDo erfolgreich aktualisiert!', type: 'success' });
    } catch (error) {
      console.error('Error updating todo:', error);
      setToast({ message: 'Fehler beim Aktualisieren des ToDos', type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const handleToggleComplete = async (todo: Todo) => {
    try {
      const response = await fetch(`/api/todos/${todo.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          is_completed: !todo.is_completed,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to update todo');
      }

      const data = await response.json();
      setTodos(todos.map(t => t.id === todo.id ? data.todo : t));
    } catch (error) {
      console.error('Error toggling todo:', error);
      setToast({ message: 'Fehler beim Aktualisieren', type: 'error' });
    }
  };

  const handleDeleteTodo = async (id: string) => {
    if (!confirm('Möchten Sie dieses ToDo wirklich löschen?')) {
      return;
    }

    try {
      const response = await fetch(`/api/todos/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete todo');
      }

      setTodos(todos.filter(t => t.id !== id));
      setToast({ message: 'ToDo gelöscht', type: 'success' });
    } catch (error) {
      console.error('Error deleting todo:', error);
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

  const getPriorityColor = (priority: string) => {
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

  const getPriorityLabel = (priority: string) => {
    switch (priority) {
      case 'urgent':
        return 'Dringend';
      case 'high':
        return 'Hoch';
      case 'medium':
        return 'Mittel';
      case 'low':
        return 'Niedrig';
      default:
        return priority;
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return null;
    const date = new Date(dateString);
    return date.toLocaleDateString('de-DE', { 
      day: '2-digit', 
      month: '2-digit', 
      year: 'numeric' 
    });
  };

  const isOverdue = (dateString: string | null) => {
    if (!dateString) return false;
    return new Date(dateString) < new Date();
  };

  if (loading) {
    return <LoadingScreen />;
  }

  const incompleteTodos = todos.filter(t => !t.is_completed);
  const completedTodos = todos.filter(t => t.is_completed);

  return (
    <div className="h-[100dvh] overflow-y-auto overflow-x-hidden bg-gradient-to-b from-[#0a0a0a] via-[#121212] to-[#1a1a1a] text-white">
      <AuthBackground />

      <div className="relative z-10 max-w-5xl mx-auto px-6 py-8">
        {/* Header */}
        <div className="flex justify-between items-center mb-8 card-stagger-1">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.push('/dashboard')}
              className="p-2 rounded-lg hover:bg-white/10 transition-all border border-white/10 hover:scale-105"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-4xl font-bold flex items-center gap-3">
                <CheckSquare className="w-10 h-10 icon-pulse" />
                Meine ToDos
              </h1>
              <p className="text-gray-400 mt-2">
                {incompleteTodos.length} offen, {completedTodos.length} erledigt
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              resetForm();
              setShowAddModal(true);
            }}
            className="px-4 py-2 rounded-lg bg-blue-500 hover:bg-blue-600 transition-all flex items-center gap-2 font-medium hover:scale-105 hover:shadow-lg hover:shadow-blue-500/50"
          >
            <Plus className="w-5 h-5" />
            Neues ToDo
          </button>
        </div>

        {/* Incomplete Todos */}
        <div className="mb-8 card-stagger-2">
          <h2 className="text-2xl font-semibold mb-4">Offen</h2>
          {incompleteTodos.length === 0 ? (
            <div className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-2xl p-8 text-center content-fade-in">
              <p className="text-gray-400">Keine offenen ToDos. Erstelle ein neues!</p>
            </div>
          ) : (
            <div className="space-y-3">
              {incompleteTodos.map((todo, index) => (
                <div
                  key={todo.id}
                  className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-xl p-4 hover:bg-white/10 transition-all content-fade-in hover:scale-[1.02] hover:shadow-lg hover:shadow-blue-500/10"
                  style={{ animationDelay: `${index * 0.05}s` }}
                >
                  <div className="flex items-start gap-4">
                    <input
                      type="checkbox"
                      checked={todo.is_completed}
                      onChange={() => handleToggleComplete(todo)}
                      className="mt-1 w-5 h-5 cursor-pointer"
                    />
                    <div className="flex-1">
                      <h3 className="text-lg font-medium">{todo.title}</h3>
                      {todo.description && (
                        <p className="text-sm text-gray-400 mt-1">{todo.description}</p>
                      )}
                      <div className="flex items-center gap-3 mt-2">
                        <span className={`px-2 py-1 rounded text-xs border ${getPriorityColor(todo.priority)}`}>
                          {getPriorityLabel(todo.priority)}
                        </span>
                        {todo.due_date && (
                          <span className={`text-xs flex items-center gap-1 ${
                            isOverdue(todo.due_date) ? 'text-red-400' : 'text-gray-400'
                          }`}>
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
                        onClick={() => handleDeleteTodo(todo.id)}
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

        {/* Completed Todos */}
        {completedTodos.length > 0 && (
          <div className="card-stagger-3">
            <h2 className="text-2xl font-semibold mb-4">Erledigt</h2>
            <div className="space-y-3">
              {completedTodos.map((todo, index) => (
                <div
                  key={todo.id}
                  className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-xl p-4 opacity-60 content-fade-in hover:opacity-80 transition-all"
                  style={{ animationDelay: `${index * 0.05}s` }}
                >
                  <div className="flex items-start gap-4">
                    <input
                      type="checkbox"
                      checked={todo.is_completed}
                      onChange={() => handleToggleComplete(todo)}
                      className="mt-1 w-5 h-5 cursor-pointer"
                    />
                    <div className="flex-1">
                      <h3 className="text-lg font-medium line-through">{todo.title}</h3>
                      {todo.description && (
                        <p className="text-sm text-gray-400 mt-1 line-through">{todo.description}</p>
                      )}
                    </div>
                    <button
                      onClick={() => handleDeleteTodo(todo.id)}
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
      </div>

      {/* Add TODO Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 modal-backdrop-animate">
          <div className="bg-gradient-to-b from-[#1a1a1a] to-[#0f0f0f] border border-white/10 rounded-2xl p-8 max-w-md w-full mx-4 max-h-[90vh] overflow-y-auto modal-animate">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-semibold">Neues ToDo</h2>
              <button
                onClick={() => setShowAddModal(false)}
                className="p-2 rounded-lg hover:bg-white/10 transition-all hover:scale-110"
              >
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
                  onChange={e => setTitle(e.target.value)}
                />
                <label>Titel *</label>
              </div>

              <div className="field modal-field-2">
                <textarea
                  className="focus-glow px-4 py-3 rounded-xl text-white placeholder-transparent w-full min-h-[100px]"
                  placeholder=" "
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                />
                <label>Beschreibung</label>
              </div>

              <div className="field modal-field-3">
                <input
                  className="focus-glow px-4 py-3 rounded-xl text-white placeholder-transparent w-full"
                  type="date"
                  placeholder=" "
                  value={dueDate}
                  onChange={e => setDueDate(e.target.value)}
                />
                <label>Fälligkeitsdatum</label>
              </div>

              <div className="field modal-field-4">
                <select
                  className="focus-glow px-4 py-3 rounded-xl text-white w-full"
                  value={priority}
                  onChange={e => setPriority(e.target.value as 'low' | 'medium' | 'high' | 'urgent')}
                >
                  <option value="low">Niedrig</option>
                  <option value="medium">Mittel</option>
                  <option value="high">Hoch</option>
                  <option value="urgent">Dringend</option>
                </select>
                <label>Priorität</label>
              </div>
            </div>

            <div className="flex gap-3 mt-6 modal-buttons-animate">
              <button
                onClick={() => setShowAddModal(false)}
                className="flex-1 py-2 rounded-lg bg-white/10 hover:bg-white/20 border border-white/20 transition-all hover:scale-105"
              >
                Abbrechen
              </button>
              <button
                onClick={handleAddTodo}
                disabled={saving}
                className="flex-1 py-2 rounded-lg bg-blue-500 hover:bg-blue-600 transition-all disabled:opacity-50 hover:scale-105 hover:shadow-lg hover:shadow-blue-500/50"
              >
                {saving ? 'Speichern...' : 'Erstellen'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit TODO Modal */}
      {showEditModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 modal-backdrop-animate">
          <div className="bg-gradient-to-b from-[#1a1a1a] to-[#0f0f0f] border border-white/10 rounded-2xl p-8 max-w-md w-full mx-4 max-h-[90vh] overflow-y-auto modal-animate">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-semibold">ToDo bearbeiten</h2>
              <button
                onClick={() => {
                  setShowEditModal(false);
                  setEditingTodo(null);
                  resetForm();
                }}
                className="p-2 rounded-lg hover:bg-white/10 transition-all hover:scale-110"
              >
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
                  onChange={e => setTitle(e.target.value)}
                />
                <label>Titel *</label>
              </div>

              <div className="field">
                <textarea
                  className="focus-glow px-4 py-3 rounded-xl text-white placeholder-transparent w-full min-h-[100px]"
                  placeholder=" "
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                />
                <label>Beschreibung</label>
              </div>

              <div className="field">
                <input
                  className="focus-glow px-4 py-3 rounded-xl text-white placeholder-transparent w-full"
                  type="date"
                  placeholder=" "
                  value={dueDate}
                  onChange={e => setDueDate(e.target.value)}
                />
                <label>Fälligkeitsdatum</label>
              </div>

              <div className="field modal-field-4">
                <select
                  className="focus-glow px-4 py-3 rounded-xl text-white w-full"
                  value={priority}
                  onChange={e => setPriority(e.target.value as 'low' | 'medium' | 'high' | 'urgent')}
                >
                  <option value="low">Niedrig</option>
                  <option value="medium">Mittel</option>
                  <option value="high">Hoch</option>
                  <option value="urgent">Dringend</option>
                </select>
                <label>Priorität</label>
              </div>
            </div>

            <div className="flex gap-3 mt-6 modal-buttons-animate">
              <button
                onClick={() => {
                  setShowEditModal(false);
                  setEditingTodo(null);
                  resetForm();
                }}
                className="flex-1 py-2 rounded-lg bg-white/10 hover:bg-white/20 border border-white/20 transition-all hover:scale-105"
              >
                Abbrechen
              </button>
              <button
                onClick={handleEditTodo}
                disabled={saving}
                className="flex-1 py-2 rounded-lg bg-blue-500 hover:bg-blue-600 transition-all disabled:opacity-50 hover:scale-105 hover:shadow-lg hover:shadow-blue-500/50"
              >
                {saving ? 'Speichern...' : 'Aktualisieren'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast Notification */}
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
    </div>
  );
}
