'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import AuthBackground from '@/app/components/common/AuthBackground';
import LoadingScreen from '@/app/components/common/LoadingScreen';
import Toast from '@/app/components/common/Toast';
import { ArrowLeft, BookOpen, Trash2, Plus, CalendarDays } from 'lucide-react';

type Subject = {
  id: string;
  name: string;
  color: string;
  type: 'HAUPTFACH' | 'NEBENFACH';
};

type HomeworkItem = {
  id: string;
  task: string;
  homework_date: string;
  due_date: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  created_at: string;
  subject_id: string;
  subjects?: {
    id: string;
    name: string;
    color: string;
    type: 'HAUPTFACH' | 'NEBENFACH';
  }[];
};

const getPriorityLabel = (priority: HomeworkItem['priority']) => {
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

const getPriorityClass = (priority: HomeworkItem['priority']) => {
  switch (priority) {
    case 'urgent':
      return 'bg-red-500/20 border-red-500/40 text-red-300';
    case 'high':
      return 'bg-orange-500/20 border-orange-500/40 text-orange-300';
    case 'medium':
      return 'bg-yellow-500/20 border-yellow-500/40 text-yellow-300';
    case 'low':
      return 'bg-green-500/20 border-green-500/40 text-green-300';
    default:
      return 'bg-gray-500/20 border-gray-500/40 text-gray-300';
  }
};

export default function HomeworkPage() {
  const [loading, setLoading] = useState(true);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [homework, setHomework] = useState<HomeworkItem[]>([]);
  const [task, setTask] = useState('');
  const [homeworkDate, setHomeworkDate] = useState(new Date().toISOString().split('T')[0]);
  const [dueDate, setDueDate] = useState('');
  const [priority, setPriority] = useState<HomeworkItem['priority']>('medium');
  const [subjectId, setSubjectId] = useState('');
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const supabase = createClient();
  const router = useRouter();

  const loadData = async () => {
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        router.push('/login');
        return;
      }

      const [subjectsResponse, homeworkResponse] = await Promise.all([
        fetch('/api/subjects'),
        fetch('/api/homework'),
      ]);

      if (!subjectsResponse.ok || !homeworkResponse.ok) {
        throw new Error('Daten konnten nicht geladen werden');
      }

      const subjectsData = await subjectsResponse.json();
      const homeworkData = await homeworkResponse.json();

      const loadedSubjects: Subject[] = Array.isArray(subjectsData) ? subjectsData : [];
      setSubjects(loadedSubjects);
      setHomework(homeworkData.homework || []);

      if (loadedSubjects.length > 0 && !subjectId) {
        setSubjectId(loadedSubjects[0].id);
      }

      setLoading(false);
    } catch (error) {
      console.error(error);
      setToast({ message: 'Fehler beim Laden der Hausaufgaben', type: 'error' });
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCreateHomework = async () => {
    if (!task.trim() || !homeworkDate || !dueDate || !priority || !subjectId) {
      setToast({ message: 'Bitte alle Felder ausfüllen', type: 'error' });
      return;
    }

    setSaving(true);

    try {
      const response = await fetch('/api/homework', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          task: task.trim(),
          homework_date: homeworkDate,
          due_date: dueDate,
          priority,
          subject_id: subjectId,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Hausaufgabe konnte nicht gespeichert werden');
      }

      const data = await response.json();
      setHomework((prev) => [data.homework, ...prev]);
      setTask('');
      setDueDate('');
      setPriority('medium');
      setToast({ message: 'Hausaufgabe erstellt', type: 'success' });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unbekannter Fehler';
      setToast({ message, type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteHomework = async (id: string) => {
    const confirmed = confirm('Hausaufgabe wirklich löschen?');
    if (!confirmed) return;

    try {
      const response = await fetch(`/api/homework/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Löschen fehlgeschlagen');
      }

      setHomework((prev) => prev.filter((item) => item.id !== id));
      setToast({ message: 'Hausaufgabe gelöscht', type: 'success' });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unbekannter Fehler';
      setToast({ message, type: 'error' });
    }
  };

  if (loading) {
    return <LoadingScreen />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#0a0a0a] via-[#121212] to-[#1a1a1a] text-white">
      <AuthBackground />

      <div className="relative z-10 max-w-5xl mx-auto px-6 py-8">
        <div className="flex items-center gap-4 mb-8 card-stagger-1">
          <button
            onClick={() => router.push('/dashboard')}
            className="p-2 rounded-lg hover:bg-white/10 transition-all border border-white/10 hover:scale-105"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-4xl font-bold flex items-center gap-3">
            <BookOpen className="w-8 h-8" /> Hausaufgaben
          </h1>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-2xl p-6 card-stagger-2 lg:col-span-1 h-fit">
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <Plus className="w-5 h-5" /> Neue Hausaufgabe
            </h2>

            <div className="space-y-4">
              <div className="field modal-field-1">
                <textarea
                  className="focus-glow px-4 py-3 rounded-xl text-white placeholder-transparent w-full min-h-[120px]"
                  placeholder=" "
                  value={task}
                  onChange={(e) => setTask(e.target.value)}
                />
                <label>Aufgabe</label>
              </div>

              <div className="field modal-field-2">
                <input
                  className="focus-glow px-4 py-3 rounded-xl text-white placeholder-transparent w-full"
                  type="date"
                  placeholder=" "
                  value={homeworkDate}
                  onChange={(e) => setHomeworkDate(e.target.value)}
                />
                <label>Datum der Hausaufgabe</label>
              </div>

              <div className="field modal-field-3">
                <input
                  className="focus-glow px-4 py-3 rounded-xl text-white placeholder-transparent w-full"
                  type="date"
                  placeholder=" "
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                />
                <label>Muss erledigt sein bis</label>
              </div>

              <div className="field modal-field-4">
                <select
                  className="focus-glow px-4 py-3 rounded-xl text-white w-full"
                  value={priority}
                  onChange={(e) => setPriority(e.target.value as HomeworkItem['priority'])}
                >
                  <option value="low">Niedrig</option>
                  <option value="medium">Mittel</option>
                  <option value="high">Hoch</option>
                  <option value="urgent">Dringend</option>
                </select>
                <label>Priorität</label>
              </div>

              <div className="field modal-field-5">
                <select
                  className="focus-glow px-4 py-3 rounded-xl text-white w-full"
                  value={subjectId}
                  onChange={(e) => setSubjectId(e.target.value)}
                  disabled={subjects.length === 0}
                >
                  {subjects.length === 0 ? (
                    <option value="">Keine Fächer verfügbar</option>
                  ) : (
                    subjects.map((subject) => (
                      <option key={subject.id} value={subject.id}>
                        {subject.name}
                      </option>
                    ))
                  )}
                </select>
                <label>Fach</label>
              </div>

              <div className="modal-buttons-animate">
                <button
                  onClick={handleCreateHomework}
                  disabled={saving || subjects.length === 0}
                  className="w-full py-3 rounded-lg bg-blue-500 hover:bg-blue-600 text-white font-medium transition-all disabled:opacity-50"
                >
                  {saving ? 'Speichert...' : 'Hausaufgabe speichern'}
                </button>
              </div>

              <p className="text-xs text-gray-500">
                Hausaufgaben werden automatisch nach 30 Tagen gelöscht.
              </p>
            </div>
          </div>

          <div className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-2xl p-6 card-stagger-3 lg:col-span-2">
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <CalendarDays className="w-5 h-5" /> Deine Hausaufgaben
            </h2>

            <div className="space-y-3">
              {homework.length === 0 ? (
                <p className="text-sm text-gray-400">Noch keine Hausaufgaben eingetragen</p>
              ) : (
                homework.map((item, index) => {
                  const subject = item.subjects?.[0];
                  return (
                    <div
                      key={item.id}
                      className="p-4 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-all appointment-item-animate"
                      style={{ animationDelay: `${Math.min(index * 60, 420)}ms` }}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <p className="text-base font-medium text-white break-words">{item.task}</p>

                          <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
                            <span className={`px-2 py-1 rounded border ${getPriorityClass(item.priority)}`}>
                              {getPriorityLabel(item.priority)}
                            </span>

                            {subject && (
                              <span className="px-2 py-1 rounded border border-white/10 bg-white/5 text-gray-200 inline-flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: subject.color }}></span>
                                {subject.name}
                              </span>
                            )}

                            <span className="px-2 py-1 rounded border border-white/10 bg-white/5 text-gray-300">
                              Aufgabe: {new Date(item.homework_date).toLocaleDateString('de-DE')}
                            </span>
                            <span className="px-2 py-1 rounded border border-red-400/20 bg-red-500/10 text-red-300">
                              Fällig: {new Date(item.due_date).toLocaleDateString('de-DE')}
                            </span>
                          </div>
                        </div>

                        <button
                          onClick={() => handleDeleteHomework(item.id)}
                          className="p-2 rounded-lg hover:bg-red-500/20 transition-all border border-white/10 hover:border-red-400/40"
                          title="Hausaufgabe löschen"
                        >
                          <Trash2 className="w-4 h-4 text-red-300" />
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>

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
