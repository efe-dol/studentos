'use client';
import { useEffect, useMemo, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import AuthBackground from '@/app/components/common/AuthBackground';
import LoadingScreen from '@/app/components/common/LoadingScreen';
import Toast from '@/app/components/common/Toast';
import GradesTab from '@/app/components/grades/GradesTab';
import TodosTab from '@/app/components/todos/TodosTab';
import Select from '@/app/components/common/Select';
import { useDelayedFlag } from '@/lib/hooks/useDelayedFlag';
import { calculateOverallAverage, getGradeLabel } from '@/lib/grades/calculator';
import { Settings, CheckSquare, BookOpen, BarChart3, Calendar, Zap, Edit, UtensilsCrossed, ListTodo, Shield, AlertTriangle, X, Clock, Plus, Trash2, Bell, BellOff, Share2, Download, Heart, Info } from 'lucide-react';

type User = {
  id: string;
  email?: string;
};

type Profile = {
  first_name: string;
  last_name: string;
  class_name: string;
  school: string;
  role?: 'user' | 'admin';
};

type Todo = {
  id: string;
  title: string;
  description: string | null;
  due_date: string | null;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  is_completed: boolean;
  created_at: string;
};

type MaintenanceMessage = {
  id: string;
  message: string;
  is_active: boolean;
};

type Appointment = {
  id: string;
  name: string;
  description: string | null;
  starts_at: string;
  color: string;
  created_at: string;
};

type HomeworkSubject = {
  id: string;
  name: string;
  color: string;
  type: 'HAUPTFACH' | 'NEBENFACH';
  sa_double?: boolean;
  default_room?: string | null;
  default_teacher?: string | null;
};

type SubjectRelation = HomeworkSubject | HomeworkSubject[] | null;

type HomeworkItem = {
  id: string;
  task: string;
  homework_date: string;
  due_date: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  created_at: string;
  subject_id: string;
  subjects?: SubjectRelation;
};

type ScheduleEntry = {
  id: string;
  weekday: 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday';
  start_time: string;
  end_time: string;
  room: string | null;
  teacher: string | null;
  created_at: string;
  is_break?: boolean;
  subject_id: string | null;
  subjects?: SubjectRelation;
};

type SchedulePreset = {
  id: string;
  label: string;
  start: string;
  end: string;
  defaultType?: 'break';
};

type GradeEntry = {
  id: string;
  subject_id: string;
  grade: number;
  grade_type: 'SCHULAUFGABE' | 'MÜNDLICH' | 'KURZARBEIT' | 'KSL';
  weight: number;
};

const GRADE_BUCKETS = [
  { key: 1, label: '1', color: '#dbeafe' },
  { key: 2, label: '2', color: '#93c5fd' },
  { key: 3, label: '3', color: '#60a5fa' },
  { key: 4, label: '4', color: '#3b82f6' },
  { key: 5, label: '5', color: '#2563eb' },
  { key: 6, label: '6', color: '#1e40af' },
] as const;

const WEEKDAY_LABELS: Record<ScheduleEntry['weekday'], string> = {
  monday: 'Montag',
  tuesday: 'Dienstag',
  wednesday: 'Mittwoch',
  thursday: 'Donnerstag',
  friday: 'Freitag',
};

const WEEKDAY_ORDER: ScheduleEntry['weekday'][] = [
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
];

const getCurrentSchoolWeekday = (): ScheduleEntry['weekday'] => {
  const currentDay = new Date().getDay();
  if (currentDay >= 1 && currentDay <= 5) {
    return WEEKDAY_ORDER[currentDay - 1];
  }
  return 'monday';
};

const SCHEDULE_BREAK_OPTION = '__break__';
const SCHEDULE_FREE_OPTION = '__free__';
const SCHEDULE_BREAK_KIND_PAUSE = '__break_pause__';
const SCHEDULE_BREAK_KIND_FREE = '__break_free__';
const DEFAULT_SCHEDULE_PRESET_ID = 'lesson-1';
const SCHEDULE_PRESETS: SchedulePreset[] = [
  { id: 'lesson-1', label: 'Stunde 1', start: '07:35', end: '08:20' },
  { id: 'lesson-2', label: 'Stunde 2', start: '08:20', end: '09:05' },
  { id: 'break-1', label: 'Pause', start: '09:05', end: '09:25', defaultType: 'break' },
  { id: 'lesson-3', label: 'Stunde 3', start: '09:25', end: '10:10' },
  { id: 'lesson-4', label: 'Stunde 4', start: '10:10', end: '10:55' },
  { id: 'break-2', label: 'Pause', start: '10:55', end: '11:15', defaultType: 'break' },
  { id: 'lesson-5', label: 'Stunde 5', start: '11:15', end: '12:00' },
  { id: 'lesson-6', label: 'Stunde 6', start: '12:00', end: '12:45' },
  { id: 'break-3', label: 'Mittagspause/Pause', start: '12:45', end: '13:30', defaultType: 'break' },
  { id: 'lesson-8', label: 'Stunde 8', start: '13:30', end: '14:15' },
  { id: 'lesson-9', label: 'Stunde 9', start: '14:15', end: '15:00' },
  { id: 'break-4', label: 'Pause', start: '15:00', end: '15:05', defaultType: 'break' },
  { id: 'lesson-10', label: 'Stunde 10', start: '15:05', end: '15:50' },
  { id: 'lesson-11', label: 'Stunde 11', start: '15:50', end: '16:35' },
];
const DASHBOARD_VERSION = 'v0.3.0';

export default function Dashboard() {
  const FIXED_SCHOOL_NAME = 'Gymnasium Weilheim i.OB';
  const NOTIFICATIONS_DEV_NOTICE = 'Benachrichtigungen funktionieren aktuell noch nicht. Diese Funktion ist in Entwicklung.';
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [todos, setTodos] = useState<Todo[]>([]);
  const [grades, setGrades] = useState<GradeEntry[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [homework, setHomework] = useState<HomeworkItem[]>([]);
  const [homeworkSubjects, setHomeworkSubjects] = useState<HomeworkSubject[]>([]);
  const [scheduleEntries, setScheduleEntries] = useState<ScheduleEntry[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [maintenanceMessages, setMaintenanceMessages] = useState<MaintenanceMessage[]>([]);
  const [dismissedMessages, setDismissedMessages] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [appointmentName, setAppointmentName] = useState('');
  const [appointmentDescription, setAppointmentDescription] = useState('');
  const [appointmentDate, setAppointmentDate] = useState('');
  const [appointmentTime, setAppointmentTime] = useState('');
  const [appointmentColor, setAppointmentColor] = useState('#3b82f6');
  const [editingAppointmentId, setEditingAppointmentId] = useState<string | null>(null);
  const [savingAppointment, setSavingAppointment] = useState(false);
  const [homeworkTask, setHomeworkTask] = useState('');
  const [homeworkDate, setHomeworkDate] = useState(new Date().toISOString().split('T')[0]);
  const [homeworkDueDate, setHomeworkDueDate] = useState('');
  const [homeworkPriority, setHomeworkPriority] = useState<'low' | 'medium' | 'high' | 'urgent'>('medium');
  const [homeworkSubjectId, setHomeworkSubjectId] = useState('');
  const [savingHomework, setSavingHomework] = useState(false);
  const [deletingHomeworkId, setDeletingHomeworkId] = useState<string | null>(null);
  const [scheduleWeekday, setScheduleWeekday] = useState<ScheduleEntry['weekday']>('monday');
  const [scheduleViewWeekday, setScheduleViewWeekday] = useState<ScheduleEntry['weekday']>('monday');
  const [schedulePresetId, setSchedulePresetId] = useState(DEFAULT_SCHEDULE_PRESET_ID);
  const [scheduleStartTime, setScheduleStartTime] = useState('');
  const [scheduleEndTime, setScheduleEndTime] = useState('');
  const [scheduleDurationOverride, setScheduleDurationOverride] = useState(false);
  const [scheduleSubjectId, setScheduleSubjectId] = useState('');
  const [scheduleRoom, setScheduleRoom] = useState('');
  const [scheduleTeacher, setScheduleTeacher] = useState('');
  const [scheduleRoomTeacherOverride, setScheduleRoomTeacherOverride] = useState(false);
  const [scheduleShareInput, setScheduleShareInput] = useState('');
  const [creatingScheduleShare, setCreatingScheduleShare] = useState(false);
  const [importingScheduleShare, setImportingScheduleShare] = useState(false);
  const [savingSchedule, setSavingSchedule] = useState(false);
  const [deletingScheduleId, setDeletingScheduleId] = useState<string | null>(null);
  const [scheduleEditMode, setScheduleEditMode] = useState(false);
  const [showScheduleForm, setShowScheduleForm] = useState(false);
  const [scheduleFormAnimated, setScheduleFormAnimated] = useState(false);
  const [pushSupported, setPushSupported] = useState(false);
  const [pushSubscribed, setPushSubscribed] = useState(false);
  const [pushLoading, setPushLoading] = useState(false);
  const [subscriptionEndpoint, setSubscriptionEndpoint] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const supabase = createClient();
  const router = useRouter();
  const showLoader = useDelayedFlag(loading);

  const extractFirstName = (value?: string) => {
    return String(value || '').trim().split(/\s+/)[0] || '';
  };

  const toDisplayName = (value?: string) => {
    const firstName = extractFirstName(value);
    if (!firstName) return '';
    return firstName.charAt(0).toUpperCase() + firstName.slice(1).toLowerCase();
  };

  const getRelatedSubject = (relation?: SubjectRelation) => {
    if (!relation) return undefined;
    if (Array.isArray(relation)) return relation[0];
    return relation;
  };

  const formatScheduleTime = (timeValue?: string | null) => {
    if (!timeValue) return '--:--';

    const cleaned = String(timeValue).trim();
    const hhmmMatch = cleaned.match(/^(\d{2}):(\d{2})/);
    if (hhmmMatch) {
      return `${hhmmMatch[1]}:${hhmmMatch[2]}`;
    }

    const parsed = new Date(cleaned);
    if (!Number.isNaN(parsed.getTime())) {
      return parsed.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
    }

    return cleaned;
  };

  const getFallbackFirstName = (
    sessionUser: { email?: string; user_metadata?: Record<string, unknown> },
    lastName?: string
  ) => {
    const metadata = sessionUser?.user_metadata || {};
    const emailLocalPart = sessionUser?.email?.split('@')[0] || '';
    const normalizedLastName = String(lastName || '').trim().toLowerCase();

    let emailFirstName = '';
    if (emailLocalPart && normalizedLastName && emailLocalPart.toLowerCase().endsWith(normalizedLastName)) {
      emailFirstName = emailLocalPart.slice(0, emailLocalPart.length - normalizedLastName.length);
    }

    const metadataFirstName =
      extractFirstName(typeof metadata.first_name === 'string' ? metadata.first_name : '') ||
      (typeof metadata.name === 'string' ? metadata.name.split(' ')[0] : '') ||
      (typeof metadata.full_name === 'string' ? metadata.full_name.split(' ')[0] : '') ||
      extractFirstName(emailFirstName) ||
      extractFirstName(emailLocalPart.replace(/[._-]+/g, ' ')) ||
      'Nutzer';

    return toDisplayName(metadataFirstName) || 'Nutzer';
  };

  const isAbortError = (error: unknown) => {
    return error instanceof DOMException && error.name === 'AbortError';
  };

  const fetchTodosPreview = async (signal?: AbortSignal) => {
    try {
      const response = await fetch('/api/todos?limit=5&sortBy=priority&onlyIncomplete=true', { signal });
      if (!response.ok) return;
      const data = await response.json();
      setTodos(data.todos || []);
    } catch (error) {
      if (isAbortError(error)) return;
    }
  };

  const fetchAppointments = async (limit = 5, signal?: AbortSignal) => {
    try {
      const response = await fetch(`/api/appointments?upcoming=true&limit=${limit}`, { signal });
      if (!response.ok) {
        return;
      }

      const data = await response.json();
      setAppointments(data.appointments || []);
    } catch (error) {
      if (isAbortError(error)) return;
      console.error('Error fetching appointments:', error);
    }
  };

  const fetchHomework = async (limit = 5, signal?: AbortSignal) => {
    try {
      const response = await fetch(`/api/homework?limit=${limit}`, { signal });
      if (!response.ok) {
        return;
      }

      const data = await response.json();
      setHomework(data.homework || []);
    } catch (error) {
      if (isAbortError(error)) return;
      console.error('Error fetching homework:', error);
    }
  };

  const fetchHomeworkSubjects = async (force = false, signal?: AbortSignal) => {
    if (!force && homeworkSubjects.length > 0) {
      if (!homeworkSubjectId) {
        setHomeworkSubjectId(homeworkSubjects[0].id);
      }

      if (!scheduleSubjectId) {
        setScheduleSubjectId(homeworkSubjects[0].id);
      }

      return;
    }

    try {
      const response = await fetch('/api/subjects', { signal });
      if (!response.ok) {
        return;
      }

      const data = await response.json();
      const loadedSubjects = Array.isArray(data) ? data : [];
      setHomeworkSubjects(loadedSubjects);

      if (loadedSubjects.length > 0 && !homeworkSubjectId) {
        setHomeworkSubjectId(loadedSubjects[0].id);
      }

      if (loadedSubjects.length > 0 && !scheduleSubjectId) {
        setScheduleSubjectId(loadedSubjects[0].id);
      }
    } catch (error) {
      if (isAbortError(error)) return;
      console.error('Error fetching homework subjects:', error);
    }
  };

  const fetchScheduleEntries = async (signal?: AbortSignal) => {
    try {
      const response = await fetch('/api/schedule', { signal });
      if (!response.ok) {
        return;
      }

      const data = await response.json();
      const loadedEntries = data.schedule || [];
      setScheduleEntries(loadedEntries);
    } catch (error) {
      if (isAbortError(error)) return;
      console.error('Error fetching schedule entries:', error);
    }
  };

  const resetScheduleForm = () => {
    setScheduleWeekday('monday');
    setSchedulePresetId(DEFAULT_SCHEDULE_PRESET_ID);
    setScheduleStartTime('07:35');
    setScheduleEndTime('08:20');
    setScheduleDurationOverride(false);
    setScheduleRoom('');
    setScheduleTeacher('');
    setScheduleRoomTeacherOverride(false);
  };

  const handleCreateScheduleEntry = async () => {
    if (!scheduleEditMode) {
      setToast({ message: 'Aktiviere den Bearbeitungsmodus zum Eintragen', type: 'error' });
      return;
    }

    const isBreak = scheduleSubjectId === SCHEDULE_BREAK_OPTION || scheduleSubjectId === SCHEDULE_FREE_OPTION;
    const breakKind = scheduleSubjectId === SCHEDULE_FREE_OPTION ? SCHEDULE_BREAK_KIND_FREE : SCHEDULE_BREAK_KIND_PAUSE;

    if (!scheduleWeekday || !scheduleStartTime || !scheduleEndTime || (!scheduleSubjectId && !isBreak)) {
      setToast({ message: 'Bitte Wochentag, Zeitraum und Fach auswählen', type: 'error' });
      return;
    }

    if (scheduleStartTime >= scheduleEndTime) {
      setToast({ message: 'Die Startzeit muss vor der Endzeit liegen', type: 'error' });
      return;
    }

    setSavingSchedule(true);
    try {
      const response = await fetch('/api/schedule', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          weekday: scheduleWeekday,
          start_time: scheduleStartTime,
          end_time: scheduleEndTime,
          is_break: isBreak,
          subject_id: isBreak ? null : scheduleSubjectId,
          room: isBreak
            ? breakKind
            : !isBreak && scheduleRoomTeacherOverride
            ? scheduleRoom
            : null,
          teacher: !isBreak && scheduleRoomTeacherOverride ? scheduleTeacher : null,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Fehler beim Speichern des Stundenplan-Eintrags');
      }

      await fetchScheduleEntries();
      resetScheduleForm();
      setToast({ message: 'Stundenplan-Eintrag gespeichert', type: 'success' });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unbekannter Fehler';
      setToast({ message, type: 'error' });
    } finally {
      setSavingSchedule(false);
    }
  };

  const handleDeleteScheduleEntry = async (id: string) => {
    if (!scheduleEditMode) {
      setToast({ message: 'Löschen ist nur im Bearbeitungsmodus möglich', type: 'error' });
      return;
    }

    setDeletingScheduleId(id);
    try {
      const response = await fetch(`/api/schedule/${id}`, { method: 'DELETE' });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Fehler beim Löschen des Stundenplan-Eintrags');
      }

      setScheduleEntries((prev) => prev.filter((entry) => entry.id !== id));
      setToast({ message: 'Stundenplan-Eintrag gelöscht', type: 'success' });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unbekannter Fehler';
      setToast({ message, type: 'error' });
    } finally {
      setDeletingScheduleId(null);
    }
  };

  const extractScheduleShareToken = (rawValue: string) => {
    const value = String(rawValue || '').trim();
    if (!value) return null;

    try {
      const url = new URL(value);
      const tokenFromQuery = url.searchParams.get('scheduleShare');
      if (tokenFromQuery) return tokenFromQuery;
      const pathnameParts = url.pathname.split('/').filter(Boolean);
      return pathnameParts[pathnameParts.length - 1] || null;
    } catch {
      return value;
    }
  };

  const handleCreateScheduleShare = async () => {
    if (scheduleEntries.length === 0) {
      setToast({ message: 'Du hast keinen Stundenplan zum Teilen.', type: 'error' });
      return;
    }

    setCreatingScheduleShare(true);
    try {
      const response = await fetch('/api/schedule-share', { method: 'POST' });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Share-Link konnte nicht erstellt werden.');
      }

      const shareUrl = String(data.shareUrl || '');
      if (!shareUrl) {
        throw new Error('Ungültiger Share-Link.');
      }

      setScheduleShareInput(shareUrl);

      if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(shareUrl);
        setToast({ message: 'Share-Link kopiert. Andere Nutzer können den Stundenplan jetzt importieren.', type: 'success' });
      } else {
        setToast({ message: 'Share-Link erstellt. Bitte manuell kopieren.', type: 'success' });
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unbekannter Fehler';
      setToast({ message, type: 'error' });
    } finally {
      setCreatingScheduleShare(false);
    }
  };

  const handleRevokeScheduleShares = async () => {
    setCreatingScheduleShare(true);
    try {
      const response = await fetch('/api/schedule-share', { method: 'DELETE' });
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || 'Share-Links konnten nicht widerrufen werden.');
      }
      setScheduleShareInput('');
      setToast({ message: 'Alle von dir erstellten Share-Links wurden widerrufen.', type: 'success' });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unbekannter Fehler';
      setToast({ message, type: 'error' });
    } finally {
      setCreatingScheduleShare(false);
    }
  };

  const handleImportSharedSchedule = async () => {
    const token = extractScheduleShareToken(scheduleShareInput);

    if (!token) {
      setToast({ message: 'Bitte einen gültigen Share-Link einfügen.', type: 'error' });
      return;
    }

    setImportingScheduleShare(true);
    try {
      const response = await fetch('/api/schedule-share/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Import fehlgeschlagen.');
      }

      await Promise.all([fetchHomeworkSubjects(true), fetchScheduleEntries()]);
      setActiveTab('schedule');
      setToast({
        message: `${data.importedEntries || 0} Stundenplan-Einträge importiert (${data.importedSubjects || 0} neue Fächer). Noten wurden nicht übernommen.`,
        type: 'success',
      });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unbekannter Fehler';
      setToast({ message, type: 'error' });
    } finally {
      setImportingScheduleShare(false);
    }
  };

  const resetHomeworkForm = () => {
    setHomeworkTask('');
    setHomeworkDate(new Date().toISOString().split('T')[0]);
    setHomeworkDueDate('');
    setHomeworkPriority('medium');
  };

  const handleCreateHomework = async () => {
    if (!homeworkTask.trim() || !homeworkDate || !homeworkDueDate || !homeworkPriority || !homeworkSubjectId) {
      setToast({ message: 'Bitte alle Hausaufgaben-Felder ausfüllen', type: 'error' });
      return;
    }

    setSavingHomework(true);
    try {
      const response = await fetch('/api/homework', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          task: homeworkTask.trim(),
          homework_date: homeworkDate,
          due_date: homeworkDueDate,
          priority: homeworkPriority,
          subject_id: homeworkSubjectId,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Fehler beim Erstellen der Hausaufgabe');
      }

      await fetchHomework(activeTab === 'homework' ? 100 : 5);
      resetHomeworkForm();
      setToast({ message: 'Hausaufgabe erstellt!', type: 'success' });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unbekannter Fehler';
      setToast({ message, type: 'error' });
    } finally {
      setSavingHomework(false);
    }
  };

  const handleDeleteHomework = async (id: string) => {
    setDeletingHomeworkId(id);
    try {
      const response = await fetch(`/api/homework/${id}`, { method: 'DELETE' });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Fehler beim Löschen der Hausaufgabe');
      }

      setHomework((prev) => prev.filter((item) => item.id !== id));
      setToast({ message: 'Hausaufgabe gelöscht', type: 'success' });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unbekannter Fehler';
      setToast({ message, type: 'error' });
    } finally {
      setDeletingHomeworkId(null);
    }
  };

  const resetAppointmentForm = () => {
    setEditingAppointmentId(null);
    setAppointmentName('');
    setAppointmentDescription('');
    setAppointmentDate('');
    setAppointmentTime('');
    setAppointmentColor('#3b82f6');
  };

  const toLocalDateInput = (isoDate: string) => {
    const date = new Date(isoDate);
    const localDate = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
    return localDate.toISOString().slice(0, 10);
  };

  const toLocalTimeInput = (isoDate: string) => {
    const date = new Date(isoDate);
    const localDate = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
    return localDate.toISOString().slice(11, 16);
  };

  const handleStartEditAppointment = (appointment: Appointment) => {
    setEditingAppointmentId(appointment.id);
    setAppointmentName(appointment.name);
    setAppointmentDescription(appointment.description || '');
    setAppointmentDate(toLocalDateInput(appointment.starts_at));
    setAppointmentTime(toLocalTimeInput(appointment.starts_at));
    setAppointmentColor(appointment.color || '#3b82f6');
  };

  const handleCreateAppointment = async () => {
    if (!appointmentName.trim() || !appointmentDate || !appointmentTime) {
      setToast({ message: 'Bitte Name, Termin und Uhrzeit eingeben', type: 'error' });
      return;
    }

    setSavingAppointment(true);
    try {
      const startsAt = new Date(`${appointmentDate}T${appointmentTime}`).toISOString();
      const response = await fetch('/api/appointments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: appointmentName.trim(),
          description: appointmentDescription.trim() || null,
          starts_at: startsAt,
          color: appointmentColor,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Fehler beim Erstellen des Termins');
      }

      await fetchAppointments(activeTab === 'appointments' ? 100 : 5);
      resetAppointmentForm();
      setToast({ message: 'Termin erstellt!', type: 'success' });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unbekannter Fehler';
      setToast({ message, type: 'error' });
    } finally {
      setSavingAppointment(false);
    }
  };

  const handleUpdateAppointment = async () => {
    if (!editingAppointmentId) {
      return;
    }

    if (!appointmentName.trim() || !appointmentDate || !appointmentTime) {
      setToast({ message: 'Bitte Name, Termin und Uhrzeit eingeben', type: 'error' });
      return;
    }

    setSavingAppointment(true);
    try {
      const startsAt = new Date(`${appointmentDate}T${appointmentTime}`).toISOString();
      const response = await fetch(`/api/appointments/${editingAppointmentId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: appointmentName.trim(),
          description: appointmentDescription.trim() || null,
          starts_at: startsAt,
          color: appointmentColor,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Fehler beim Aktualisieren des Termins');
      }

      await fetchAppointments(100);
      resetAppointmentForm();
      setToast({ message: 'Termin aktualisiert!', type: 'success' });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unbekannter Fehler';
      setToast({ message, type: 'error' });
    } finally {
      setSavingAppointment(false);
    }
  };

  const handleDeleteAppointment = async (appointmentId: string) => {
    try {
      const response = await fetch(`/api/appointments/${appointmentId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Fehler beim Löschen des Termins');
      }

      setAppointments((prev) => prev.filter((appointment) => appointment.id !== appointmentId));
      if (editingAppointmentId === appointmentId) {
        resetAppointmentForm();
      }
      setToast({ message: 'Termin gelöscht', type: 'success' });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unbekannter Fehler';
      setToast({ message, type: 'error' });
    }
  };

  const urlBase64ToUint8Array = (base64String: string) => {
    const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);

    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }

    return outputArray;
  };

  const initializePushState = async () => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator) || !('PushManager' in window)) {
      setPushSupported(false);
      return;
    }

    setPushSupported(true);

    try {
      const registration = await navigator.serviceWorker.register('/sw.js');
      const existingSubscription = await registration.pushManager.getSubscription();

      if (existingSubscription) {
        setPushSubscribed(true);
        setSubscriptionEndpoint(existingSubscription.endpoint);
      } else {
        setPushSubscribed(false);
        setSubscriptionEndpoint(null);
      }
    } catch (error) {
      console.error('Push init error:', error);
      setPushSupported(false);
    }
  };

  const handleEnablePush = async () => {
    const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;

    if (!vapidPublicKey) {
      setToast({ message: 'VAPID Public Key fehlt in der Konfiguration', type: 'error' });
      return;
    }

    if (!pushSupported) {
      setToast({ message: 'Push wird auf diesem Gerät/Browser nicht unterstützt', type: 'error' });
      return;
    }

    setPushLoading(true);
    try {
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        setToast({ message: 'Benachrichtigungs-Berechtigung wurde nicht erteilt', type: 'error' });
        return;
      }

      const registration = await navigator.serviceWorker.register('/sw.js');
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
      });

      const response = await fetch('/api/push-subscriptions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subscription }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Fehler beim Aktivieren von Push');
      }

      setPushSubscribed(true);
      setSubscriptionEndpoint(subscription.endpoint);
      setToast({ message: 'Push-Benachrichtigungen aktiviert', type: 'success' });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unbekannter Fehler';
      setToast({ message, type: 'error' });
    } finally {
      setPushLoading(false);
    }
  };

  const handleDisablePush = async () => {
    if (!pushSupported) {
      return;
    }

    setPushLoading(true);
    try {
      const registration = await navigator.serviceWorker.register('/sw.js');
      const subscription = await registration.pushManager.getSubscription();

      if (!subscription) {
        setPushSubscribed(false);
        setSubscriptionEndpoint(null);
        return;
      }

      const endpoint = subscriptionEndpoint || subscription.endpoint;

      await fetch('/api/push-subscriptions', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ endpoint }),
      });

      await subscription.unsubscribe();
      setPushSubscribed(false);
      setSubscriptionEndpoint(null);
      setToast({ message: 'Push-Benachrichtigungen deaktiviert', type: 'success' });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unbekannter Fehler';
      setToast({ message, type: 'error' });
    } finally {
      setPushLoading(false);
    }
  };

  useEffect(() => {
    const controller = new AbortController();

    const getSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          router.push('/login');
          return;
        }

        setUser(session.user);

        // Fetch profile
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('first_name, last_name, class_name, school, role')
          .eq('id', session.user.id)
          .single();

        if (profileError) {
          console.error('Profile fetch failed');
        }

        if (profileData) {
          const resolvedFirstName =
            toDisplayName(profileData.first_name) || getFallbackFirstName(session.user, profileData.last_name);
          const normalizedProfile = {
            ...profileData,
            first_name: resolvedFirstName,
            school: FIXED_SCHOOL_NAME,
          };

          setProfile(normalizedProfile);
          setIsAdmin(profileData.role === 'admin');
        } else {
            const fallbackFirstName = getFallbackFirstName(session.user);
              // Fallback: setze einen Namen aus Auth-Metadaten (oder E-Mail)
              setProfile({
                first_name: fallbackFirstName,
                last_name: '',
                class_name: '',
                school: FIXED_SCHOOL_NAME
              });
            }

        await Promise.allSettled([
          (async () => {
            try {
              const response = await fetch('/api/todos?limit=5&sortBy=priority&onlyIncomplete=true', {
                signal: controller.signal,
              });
              if (response.ok) {
                const data = await response.json();
                setTodos(data.todos || []);
              }
            } catch (error) {
              if (isAbortError(error)) return;
              console.error('Error fetching todos:', error);
            }
          })(),
          fetchAppointments(5, controller.signal),
          fetchHomework(5, controller.signal),
          (async () => {
            try {
              const response = await fetch('/api/maintenance', { signal: controller.signal });
              if (response.ok) {
                const data = await response.json();
                setMaintenanceMessages(data.messages || []);
              }
            } catch (error) {
              if (isAbortError(error)) return;
              console.error('Error fetching maintenance messages:', error);
            }
          })(),
          (async () => {
            try {
              const response = await fetch('/api/grades', { signal: controller.signal });
              if (response.ok) {
                const data = await response.json();
                setGrades(Array.isArray(data) ? data : []);
              }
            } catch (error) {
              if (isAbortError(error)) return;
              console.error('Error fetching grades:', error);
            }
          })(),
        ]);

        
        setLoading(false);
      } catch (error) {
        console.error('Session error:', error);
        router.push('/login');
      }
    };

    getSession();
    return () => controller.abort();
  }, []);

  useEffect(() => {
    const controller = new AbortController();

    if (activeTab === 'dashboard') {
      fetchHomeworkSubjects(false, controller.signal);
      fetchTodosPreview(controller.signal);
    }

    if (activeTab === 'appointments') {
      fetchAppointments(100, controller.signal);
    }

    if (activeTab === 'homework') {
      fetchHomework(100, controller.signal);
      fetchHomeworkSubjects(false, controller.signal);
    }

    if (activeTab === 'schedule') {
      fetchScheduleEntries(controller.signal);
      fetchHomeworkSubjects(false, controller.signal);
      const currentWeekday = getCurrentSchoolWeekday();
      setScheduleViewWeekday(currentWeekday);
      setScheduleWeekday(currentWeekday);
    }

    return () => controller.abort();
  }, [activeTab]);

  useEffect(() => {
    initializePushState();
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const token = new URLSearchParams(window.location.search).get('scheduleShare');
    if (!token) return;

    setActiveTab('schedule');
    setScheduleShareInput(token);
  }, []);

  useEffect(() => {
    if (scheduleEditMode) {
      setScheduleWeekday(scheduleViewWeekday);
      setShowScheduleForm(true);

      const frame = requestAnimationFrame(() => {
        setScheduleFormAnimated(true);
      });

      return () => cancelAnimationFrame(frame);
    }

    setScheduleFormAnimated(false);

    const timeout = setTimeout(() => {
      setShowScheduleForm(false);
    }, 320);

    return () => clearTimeout(timeout);
  }, [scheduleEditMode, scheduleViewWeekday]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    if (typeof window !== 'undefined') {
      localStorage.removeItem('sb_auth_session');
    }
    router.push('/login');
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 12) {
      return 'Guten Morgen';
    } else if (hour >= 18 && hour < 24) {
      return 'Guten Abend';
    }
    return 'Hey';
  };

  const formatDate = () => {
    const options: Intl.DateTimeFormatOptions = {
      weekday: 'long',
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    };
    return new Date().toLocaleDateString('de-DE', options);
  };

  const upcomingAppointments = useMemo(
    () =>
      appointments
        .filter((appointment) => new Date(appointment.starts_at).getTime() >= Date.now())
        .sort((a, b) => new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime()),
    [appointments]
  );

  const upcomingHomework = useMemo(() => {
    const nowStartOfDay = new Date();
    nowStartOfDay.setHours(0, 0, 0, 0);

    return homework
      .filter((item) => new Date(item.due_date).getTime() >= nowStartOfDay.getTime())
      .sort((a, b) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime());
  }, [homework]);

  const gradeCount = grades.length;
  const weightedAverage = useMemo(
    () =>
      calculateOverallAverage(
        homeworkSubjects.map((subject) => ({
          ...subject,
          grades: grades.filter((grade) => grade.subject_id === subject.id),
        }))
      ),
    [homeworkSubjects, grades]
  );

  const averageLabel = useMemo(() => {
    if (weightedAverage === null) return '—';
    return getGradeLabel(weightedAverage);
  }, [weightedAverage]);

  const gradeBucketCounts = useMemo(
    () =>
      GRADE_BUCKETS.map((bucket) => {
        const count = grades.filter((grade) => Math.min(6, Math.max(1, Math.round(grade.grade))) === bucket.key).length;
        return { ...bucket, count };
      }),
    [grades]
  );

  const gradeBucketStats = useMemo(
    () =>
      gradeBucketCounts.map((bucket) => ({
        ...bucket,
        percentage: gradeCount === 0 ? 0 : Math.round((bucket.count / gradeCount) * 100),
      })),
    [gradeBucketCounts, gradeCount]
  );

  const dominantBucket = useMemo(
    () =>
      gradeCount === 0
        ? null
        : gradeBucketStats.reduce((max, bucket) => (bucket.count > max.count ? bucket : max), gradeBucketStats[0]),
    [gradeCount, gradeBucketStats]
  );

  const donutRadius = 56;
  const donutStroke = 16;
  const donutCircumference = 2 * Math.PI * donutRadius;
  const donutSegments = useMemo(() => {
    if (gradeCount === 0) return [] as Array<{ key: number; color: string; dashArray: string; dashOffset: number }>;

    let cumulative = 0;
    return gradeBucketCounts
      .filter((bucket) => bucket.count > 0)
      .map((bucket) => {
        const segmentLength = (bucket.count / gradeCount) * donutCircumference;
        const segment = {
          key: bucket.key,
          color: bucket.color,
          dashArray: `${segmentLength} ${donutCircumference - segmentLength}`,
          dashOffset: -cumulative,
        };
        cumulative += segmentLength;
        return segment;
      });
  }, [gradeBucketCounts, gradeCount, donutCircumference]);

  const previewAppointments = useMemo(() => upcomingAppointments.slice(0, 5), [upcomingAppointments]);
  const previewHomework = useMemo(() => upcomingHomework.slice(0, 5), [upcomingHomework]);

  const orderedScheduleEntries = useMemo(
    () =>
      [...scheduleEntries].sort((a, b) => {
        const weekdayDelta = WEEKDAY_ORDER.indexOf(a.weekday) - WEEKDAY_ORDER.indexOf(b.weekday);
        if (weekdayDelta !== 0) return weekdayDelta;
        return a.start_time.localeCompare(b.start_time);
      }),
    [scheduleEntries]
  );

  const selectedScheduleDayEntries = useMemo(
    () => orderedScheduleEntries.filter((entry) => entry.weekday === scheduleViewWeekday),
    [orderedScheduleEntries, scheduleViewWeekday]
  );

  const selectedScheduleSubject = useMemo(
    () => homeworkSubjects.find((subject) => subject.id === scheduleSubjectId),
    [homeworkSubjects, scheduleSubjectId]
  );
  const selectedSchedulePreset = useMemo(
    () => SCHEDULE_PRESETS.find((preset) => preset.id === schedulePresetId),
    [schedulePresetId]
  );
  const isBreakSelected = scheduleSubjectId === SCHEDULE_BREAK_OPTION || scheduleSubjectId === SCHEDULE_FREE_OPTION;
  const isFreePeriodSelected = scheduleSubjectId === SCHEDULE_FREE_OPTION;

  useEffect(() => {
    if (isBreakSelected) {
      setScheduleRoomTeacherOverride(false);
      setScheduleRoom('');
      setScheduleTeacher('');
    }
  }, [isBreakSelected]);

  useEffect(() => {
    if (!selectedSchedulePreset || scheduleDurationOverride) {
      return;
    }

    setScheduleStartTime(selectedSchedulePreset.start);
    setScheduleEndTime(selectedSchedulePreset.end);

    if (selectedSchedulePreset.defaultType === 'break') {
      setScheduleSubjectId(SCHEDULE_BREAK_OPTION);
    }
  }, [selectedSchedulePreset, scheduleDurationOverride]);

  if (loading) {
    // Nur bei spürbarer Wartezeit (z. B. Login / langsames Backend) zeigen –
    // nicht bei jedem Seitenwechsel aufblitzen lassen.
    return showLoader ? <LoadingScreen /> : null;
  }

  return (
    <div className="fixed inset-0 bg-gradient-to-b from-[#0a0a0a] via-[#121212] to-[#1a1a1a] text-white flex flex-col">
      <AuthBackground />

      {/* Maintenance Messages Banner */}
      {maintenanceMessages.filter(m => !dismissedMessages.has(m.id)).map((message) => (
        <div
          key={message.id}
          className="relative z-20 bg-red-500/90 border-b border-red-600 backdrop-blur-xl"
        >
          <div className="max-w-7xl mx-auto px-6 py-3 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3 flex-1">
              <AlertTriangle className="w-5 h-5 text-white flex-shrink-0" />
              <p className="text-white font-medium">{message.message}</p>
            </div>
            <button
              onClick={() => setDismissedMessages(prev => new Set(prev).add(message.id))}
              className="p-1 rounded hover:bg-white/20 transition-all flex-shrink-0"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      ))}

      {/* Header */}
      <div className="relative z-10 border-b border-white/10 backdrop-blur-xl bg-white/5">
        <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center gap-4">
          <div className="min-w-0">
            <p className="text-gray-400 text-sm">{formatDate()}</p>
            <h1 className="text-3xl font-semibold mt-2 truncate">
              {getGreeting()}, {toDisplayName(profile?.first_name) || 'Nutzer'}
            </h1>
          </div>

          {/* Auf einen Blick */}
          <div className="hidden lg:flex items-stretch gap-2">
            <button
              onClick={() => setActiveTab('subjects')}
              className="group flex items-center gap-2.5 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 hover:border-white/20 px-3.5 py-2 transition-all"
              title="Zu Fächer & Noten"
            >
              <BarChart3 className="w-4 h-4 text-blue-300" />
              <span className="text-left leading-tight">
                <span className="block text-[11px] text-gray-400">Ø Schnitt</span>
                <span className="block text-sm font-semibold">
                  {weightedAverage === null ? '—' : weightedAverage.toFixed(2)}
                </span>
              </span>
            </button>

            <button
              onClick={() => setActiveTab('todos')}
              className="group flex items-center gap-2.5 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 hover:border-white/20 px-3.5 py-2 transition-all"
              title="Zu ToDos"
            >
              <CheckSquare className="w-4 h-4 text-emerald-300" />
              <span className="text-left leading-tight">
                <span className="block text-[11px] text-gray-400">Offen</span>
                <span className="block text-sm font-semibold">
                  {todos.length}{todos.length >= 5 ? '+' : ''}
                </span>
              </span>
            </button>

            <button
              onClick={() => setActiveTab('appointments')}
              className="group flex items-center gap-2.5 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 hover:border-white/20 px-3.5 py-2 transition-all max-w-[220px]"
              title="Zu Terminen"
            >
              <Calendar className="w-4 h-4 text-fuchsia-300 flex-shrink-0" />
              <span className="text-left leading-tight min-w-0">
                <span className="block text-[11px] text-gray-400">Nächster Termin</span>
                <span className="block text-sm font-semibold truncate">
                  {upcomingAppointments[0]
                    ? `${upcomingAppointments[0].name} · ${new Date(upcomingAppointments[0].starts_at).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' })}`
                    : 'Keiner'}
                </span>
              </span>
            </button>
          </div>

          <div className="flex gap-3 flex-shrink-0">
            <button
              onClick={() => router.push('/settings')}
              className="p-2 rounded-lg hover:bg-white/10 transition-all border border-white/10"
              title="Einstellungen"
            >
              <Settings className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden z-10 max-w-7xl mx-auto w-full px-6 py-8 pb-24">
        {activeTab === 'dashboard' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* ToDo's */}
            <div className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-2xl p-6 card-stagger-1">
              <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                <CheckSquare className="w-5 h-5" /> ToDos
              </h2>
              <div className="space-y-3">
                {todos.length === 0 ? (
                  <p className="text-sm text-gray-400">Keine offenen ToDos</p>
                ) : (
                  todos.slice(0, 5).map((todo) => (
                    <div key={todo.id} className="flex gap-3 p-2 rounded-lg hover:bg-white/5 transition-all">
                      <div
                        className={`w-2 h-2 rounded-full mt-2 flex-shrink-0 ${
                          todo.priority === 'urgent'
                            ? 'bg-red-500'
                            : todo.priority === 'high'
                            ? 'bg-orange-500'
                            : todo.priority === 'medium'
                            ? 'bg-yellow-500'
                            : 'bg-green-500'
                        }`}
                      />
                      <div className="flex-1 min-w-0">
                        <span className="text-sm">{todo.title}</span>
                        {todo.due_date && (
                          <p className="text-xs text-gray-400 mt-1">
                            Fällig: {new Date(todo.due_date).toLocaleDateString('de-DE')}
                          </p>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
              <button
                onClick={() => setActiveTab('todos')}
                className="w-full mt-4 py-2 px-3 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 transition-all text-sm"
              >
                Alle ToDos anzeigen
              </button>
            </div>

            {/* Hausaufgaben */}
            <div className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-2xl p-6 card-stagger-2">
              <h2 className="text-xl font-semibold mb-4 flex items-center gap-2"><BookOpen className="w-5 h-5" /> Hausaufgaben</h2>
              <div className="space-y-3">
                {previewHomework.length === 0 ? (
                  <p className="text-sm text-gray-400">Keine anstehenden Hausaufgaben</p>
                ) : (
                  previewHomework.map((item) => (
                  <div key={item.id} className="p-3 rounded-lg bg-white/5 border border-white/10">
                    <p className="text-sm font-medium">{getRelatedSubject(item.subjects)?.name || 'Fach'}</p>
                    <p className="text-xs text-gray-400 mt-1 line-clamp-2">{item.task}</p>
                    <p className="text-xs text-orange-400 mt-1">
                      Fällig: {new Date(item.due_date).toLocaleDateString('de-DE')}
                    </p>
                  </div>
                )))}
              </div>
              <button
                onClick={() => setActiveTab('homework')}
                className="w-full mt-4 py-2 px-3 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 transition-all text-sm"
              >
                Hausaufgaben verwalten
              </button>
            </div>

            {/* Notendurchschnitt */}
            <div className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-2xl p-6 card-stagger-3">
              <h2 className="text-xl font-semibold mb-4 flex items-center gap-2"><BarChart3 className="w-5 h-5" /> Leistungen</h2>
              <div className="space-y-4">
                <div className="p-3 rounded-lg bg-white/5 border border-white/10 text-sm">
                  <div className="flex justify-between items-center mb-1">
                    <p className="text-gray-400">Notendurchschnitt</p>
                    <span className="font-semibold text-lg">{weightedAverage === null ? '—' : weightedAverage.toFixed(1)}</span>
                  </div>
                  <p className="text-xs text-gray-500">
                    {gradeCount === 0 ? 'Noch keine Noten vorhanden' : `${gradeCount} Note${gradeCount !== 1 ? 'n' : ''} • ${averageLabel}`}
                  </p>
                </div>

                <div className="p-3 rounded-lg bg-white/5 border border-white/10">
                  <p className="text-sm text-gray-400 mb-3">Notenverteilung</p>
                  {gradeCount === 0 ? (
                    <p className="text-sm text-gray-500">Keine Daten für das Kreisdiagramm</p>
                  ) : (
                    <div className="flex items-center gap-4">
                      <div className="relative w-36 h-36 flex-shrink-0 grid place-items-center">
                        <div className="absolute inset-0 rounded-full bg-gradient-to-br from-cyan-400/20 via-blue-500/20 to-indigo-500/20 blur-md"></div>
                        <svg viewBox="0 0 140 140" className="w-full h-full -rotate-90 relative z-10">
                          <circle
                            cx="70"
                            cy="70"
                            r={donutRadius}
                            fill="none"
                            stroke="rgba(255,255,255,0.12)"
                            strokeWidth={donutStroke}
                          />
                          {donutSegments.map((segment) => (
                            <circle
                              key={segment.key}
                              cx="70"
                              cy="70"
                              r={donutRadius}
                              fill="none"
                              stroke={segment.color}
                              strokeWidth={donutStroke}
                              strokeDasharray={segment.dashArray}
                              strokeDashoffset={segment.dashOffset}
                              strokeLinecap="round"
                            />
                          ))}
                        </svg>
                        <div className="absolute inset-4 rounded-full bg-[#111111]/90 border border-white/10 flex flex-col items-center justify-center text-center z-20 shadow-inner shadow-black/40">
                          <span className="text-2xl font-semibold text-white">{weightedAverage?.toFixed(1) ?? '—'}</span>
                          <span className="text-[11px] text-gray-400">Ø Schnitt</span>
                        </div>
                      </div>

                      <div className="flex-1 space-y-2">
                        {gradeBucketStats.map((bucket) => (
                          <div key={bucket.key} className="space-y-1">
                            <div className="flex items-center justify-between text-xs">
                              <div className="flex items-center gap-2">
                                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: bucket.color }}></span>
                                <span className="text-gray-300">Note {bucket.label}</span>
                              </div>
                              <span className="text-gray-400">{bucket.count} • {bucket.percentage}%</span>
                            </div>
                            <div className="h-1.5 w-full rounded-full bg-white/10 overflow-hidden">
                              <div
                                className="h-full rounded-full transition-all duration-500"
                                style={{
                                  width: `${bucket.percentage}%`,
                                  backgroundColor: bucket.color,
                                }}
                              ></div>
                            </div>
                          </div>
                        ))}

                        <p className="text-[11px] text-gray-500 pt-1">
                          Häufigste Note: {dominantBucket ? `${dominantBucket.label} (${dominantBucket.count})` : '—'}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Anstehende Termine */}
            <div className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-2xl p-6 lg:col-span-2 card-stagger-4">
              <h2 className="text-xl font-semibold mb-4 flex items-center gap-2"><Calendar className="w-5 h-5" /> Nächste Termine</h2>
              <div className="space-y-2">
                {previewAppointments.length === 0 ? (
                  <p className="text-sm text-gray-400">Keine anstehenden Termine</p>
                ) : (
                  previewAppointments.map((appointment) => (
                    <div key={appointment.id} className="flex gap-2 p-2 rounded-lg hover:bg-white/5 transition-all flex-col md:flex-row md:items-center">
                      <div className="flex items-center gap-2 md:gap-3 min-w-0 flex-1">
                        <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: appointment.color }}></span>
                        <span className="text-sm font-medium whitespace-nowrap text-blue-400">
                          {new Date(appointment.starts_at).toLocaleDateString('de-DE')}
                        </span>
                      </div>
                      <span className="text-sm text-gray-300 truncate">{appointment.name}</span>
                    </div>
                  ))
                )}
              </div>
              <button
                onClick={() => setActiveTab('appointments')}
                className="w-full mt-4 py-2 px-3 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 transition-all text-sm"
              >
                Termine verwalten
              </button>
            </div>

            {/* Quick Actions */}
            <div className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-2xl p-6 card-stagger-5">
              <h2 className="text-xl font-semibold mb-4 flex items-center gap-2"><Zap className="w-5 h-5" /> Quick Links</h2>
              <div className="space-y-2">
                <button
                  onClick={() => router.push('/feedback')}
                  className="w-full py-2 px-3 rounded-lg bg-white/10 hover:bg-white/20 border border-white/20 transition-all text-sm flex items-center justify-center gap-2"
                >
                  <AlertTriangle className="w-4 h-4" />
                  Feedback / Bug-Reports
                </button>
                <a 
                  href="https://planner.gastro-smart.com/signage/16a1b964-0cc6-4cd2-a16f-ab77614fa7bf/weekly_menu/current"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full py-2 px-3 rounded-lg bg-white/10 hover:bg-white/20 border border-white/20 transition-all text-sm flex items-center justify-center gap-2"
                >
                  <UtensilsCrossed className="w-4 h-4" />
                  Wochenmenü Mensa
                </a>
              </div>
            </div>

            {/* About */}
            <div className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-2xl p-6 card-stagger-5">
              <h2 className="text-xl font-semibold mb-4 flex items-center gap-2"><Info className="w-5 h-5" /> About</h2>
              <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                <p className="text-sm text-gray-200 flex items-center gap-2">
                  Made with
                  <Heart className="w-4 h-4 text-pink-400" />
                  by Efe Dolaman
                </p>
                <p className="text-xs text-gray-400 mt-3">Version: {DASHBOARD_VERSION}</p>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'schedule' && (
          <div className="content-fade-in animate-in fade-in duration-300 slide-in-from-bottom-2">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {showScheduleForm && (
              <div
                className={`lg:col-span-1 backdrop-blur-xl rounded-2xl h-fit overflow-hidden card-stagger-1 transition-all duration-320 [transition-timing-function:cubic-bezier(0.22,1,0.36,1)] will-change-[opacity,transform,max-height] ${
                  scheduleFormAnimated
                    ? 'bg-white/5 border border-white/10 p-5 opacity-100 translate-y-0 scale-100 max-h-[900px]'
                    : 'bg-white/0 border border-transparent p-0 opacity-0 -translate-y-3 scale-95 max-h-0 pointer-events-none'
                }`}
              >
                <h2 className="text-lg font-semibold mb-4">Stundenplan-Eintrag</h2>

                <div className="space-y-4">
                  <div className="modal-field-1">
                    <label className="block text-sm font-medium mb-2 text-gray-300">Wochentag</label>
                    <Select
                      value={scheduleWeekday}
                      onChange={(v) => setScheduleWeekday(v as ScheduleEntry['weekday'])}
                      ariaLabel="Wochentag"
                      options={WEEKDAY_ORDER.map((weekday) => ({ value: weekday, label: WEEKDAY_LABELS[weekday] }))}
                    />
                  </div>

                  <div className="modal-field-2">
                    <label className="block text-sm font-medium mb-2 text-gray-300">Klassische Stundendauer</label>
                    <div className="mb-3">
                      <Select
                        value={schedulePresetId}
                        onChange={(v) => setSchedulePresetId(v)}
                        ariaLabel="Klassische Stundendauer"
                        options={SCHEDULE_PRESETS.map((preset) => ({
                          value: preset.id,
                          label: `${preset.label}: ${preset.start} - ${preset.end}`,
                        }))}
                      />
                    </div>

                    <div className="rounded-xl border border-white/10 bg-white/5 p-3 mb-3">
                      <label className="flex items-center justify-between gap-3 text-sm text-gray-200">
                        <span>Stundendauer abweichend</span>
                        <input
                          type="checkbox"
                          checked={scheduleDurationOverride}
                          onChange={(event) => {
                            const checked = event.target.checked;
                            setScheduleDurationOverride(checked);
                            if (!checked && selectedSchedulePreset) {
                              setScheduleStartTime(selectedSchedulePreset.start);
                              setScheduleEndTime(selectedSchedulePreset.end);
                            }
                          }}
                          className="h-4 w-4 rounded border-white/20 bg-black/40"
                        />
                      </label>
                      <p className="text-xs text-gray-400 mt-1">
                        Ohne Abweichung werden die klassischen Zeiten automatisch übernommen.
                      </p>
                    </div>

                    <p className="text-xs text-gray-400 mb-2">Zeitraum (von/bis)</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <input
                        type="time"
                        value={scheduleStartTime}
                        onChange={(event) => setScheduleStartTime(event.target.value)}
                        aria-label="Startzeit"
                        disabled={!scheduleDurationOverride}
                        className="w-full p-3 rounded-xl bg-white/5 border border-white/10 focus:border-cyan-500 focus:outline-none text-sm disabled:opacity-60 disabled:cursor-not-allowed"
                      />
                      <input
                        type="time"
                        value={scheduleEndTime}
                        onChange={(event) => setScheduleEndTime(event.target.value)}
                        aria-label="Endzeit"
                        disabled={!scheduleDurationOverride}
                        className="w-full p-3 rounded-xl bg-white/5 border border-white/10 focus:border-cyan-500 focus:outline-none text-sm disabled:opacity-60 disabled:cursor-not-allowed"
                      />
                    </div>
                  </div>

                  <div className="modal-field-3">
                    <label className="block text-sm font-medium mb-2 text-gray-300">Fach</label>
                    <Select
                      value={scheduleSubjectId}
                      onChange={(v) => setScheduleSubjectId(v)}
                      ariaLabel="Fach"
                      placeholder="Fach wählen"
                      options={[
                        { value: SCHEDULE_BREAK_OPTION, label: 'Pause' },
                        { value: SCHEDULE_FREE_OPTION, label: 'Freistunde' },
                        ...homeworkSubjects.map((subject) => ({ value: subject.id, label: subject.name })),
                      ]}
                    />
                    {scheduleSubjectId && (
                      <div className="mt-2 flex items-center gap-2 text-xs text-gray-300">
                        {isBreakSelected ? (
                          <span
                            className={`w-2.5 h-2.5 rounded-full ${
                              isFreePeriodSelected
                                ? 'bg-gradient-to-r from-fuchsia-400/70 to-indigo-300/70'
                                : 'bg-gradient-to-r from-fuchsia-500 to-cyan-400'
                            }`}
                          ></span>
                        ) : (
                          <span
                            className="w-2.5 h-2.5 rounded-full"
                            style={{
                              backgroundColor: selectedScheduleSubject?.color || '#3b82f6',
                            }}
                          ></span>
                        )}
                        <span>
                          {isBreakSelected
                            ? isFreePeriodSelected
                              ? 'Freistunde (dezenter Gradient)'
                              : 'Pause (Gradient)'
                            : `Farbe: ${selectedScheduleSubject?.name || 'Fach'}`}
                        </span>
                      </div>
                    )}

                    {!isBreakSelected && selectedScheduleSubject && (
                      <button
                        type="button"
                        onClick={() => setActiveTab('subjects')}
                        className="mt-2 inline-flex items-center gap-2 text-xs px-3 py-1.5 rounded-lg bg-white/5 border border-white/15 hover:bg-white/10 transition-all text-gray-200"
                      >
                        <Edit className="w-3.5 h-3.5" />
                        Gewähltes Fach bearbeiten
                      </button>
                    )}
                  </div>

                  {!isBreakSelected && (
                    <>
                      {!isBreakSelected && (
                        <>
                          <div className="modal-field-4 rounded-xl border border-white/10 bg-white/5 p-3">
                            <label className="flex items-center justify-between gap-3 text-sm text-gray-200">
                              <span>Raum/Lehrkraft abweichend</span>
                              <input
                                type="checkbox"
                                checked={scheduleRoomTeacherOverride}
                                onChange={(event) => {
                                  const checked = event.target.checked;
                                  setScheduleRoomTeacherOverride(checked);
                                  if (!checked) {
                                    setScheduleRoom('');
                                    setScheduleTeacher('');
                                  }
                                }}
                                className="h-4 w-4 rounded border-white/20 bg-black/40"
                              />
                            </label>
                            <p className="text-xs text-gray-400 mt-1">
                              Standardwerte kommen aus dem Fach.
                            </p>
                          </div>

                          {scheduleRoomTeacherOverride && (
                            <>
                              <div className="modal-field-5">
                                <label className="block text-sm font-medium mb-2 text-gray-300">Raum (abweichend)</label>
                                <input
                                  type="text"
                                  value={scheduleRoom}
                                  onChange={(event) => setScheduleRoom(event.target.value)}
                                  placeholder={`Standard: ${selectedScheduleSubject?.default_room || '—'}`}
                                  className="w-full p-3 rounded-xl bg-white/5 border border-white/10 focus:border-cyan-500 focus:outline-none text-sm"
                                />
                              </div>

                              <div className="modal-field-5">
                                <label className="block text-sm font-medium mb-2 text-gray-300">Lehrkraft (abweichend)</label>
                                <input
                                  type="text"
                                  value={scheduleTeacher}
                                  onChange={(event) => setScheduleTeacher(event.target.value)}
                                  placeholder={`Standard: ${selectedScheduleSubject?.default_teacher || '—'}`}
                                  className="w-full p-3 rounded-xl bg-white/5 border border-white/10 focus:border-cyan-500 focus:outline-none text-sm"
                                />
                              </div>
                            </>
                          )}
                        </>
                      )}
                    </>
                  )}

                  <div className="modal-buttons-animate">
                    <button
                      onClick={handleCreateScheduleEntry}
                      disabled={savingSchedule || homeworkSubjects.length === 0}
                      className="w-full py-3 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 text-white font-medium hover:from-cyan-500 hover:to-blue-500 transition-all disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                      {savingSchedule ? 'Wird gespeichert...' : 'Eintrag hinzufügen'}
                    </button>
                  </div>

                  {homeworkSubjects.length === 0 && (
                    <p className="text-xs text-amber-300">
                      Bitte zuerst im Tab &quot;Fächer&quot; mindestens ein Fach anlegen.
                    </p>
                  )}
                </div>
              </div>
              )}

              <div className={`${showScheduleForm ? 'lg:col-span-2' : 'lg:col-span-3'} backdrop-blur-xl bg-white/5 border border-white/10 rounded-2xl p-5 card-stagger-2 transition-all duration-320 [transition-timing-function:cubic-bezier(0.22,1,0.36,1)]`}>
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4 gap-3">
                  <h2 className="text-lg font-semibold">Dein Stundenplan</h2>
                  <div className="w-full sm:w-auto flex flex-wrap items-center gap-2">
                    <span className="text-xs px-2 py-1 rounded-full bg-white/10 text-gray-300 shrink-0">
                      {scheduleEntries.length} Einträge
                    </span>
                    <button
                      onClick={() => setScheduleEditMode((prev) => !prev)}
                      className={`w-full sm:w-auto text-xs px-3 py-1.5 rounded-lg border transition-all duration-320 [transition-timing-function:cubic-bezier(0.22,1,0.36,1)] ${
                        scheduleEditMode
                          ? 'bg-blue-500/20 border-blue-400/40 text-blue-200 hover:bg-blue-500/30'
                          : 'bg-white/5 border-white/15 text-gray-200 hover:bg-white/10'
                      }`}
                    >
                      {scheduleEditMode ? 'Bearbeitungsmodus aktiv' : 'Bearbeitungsmodus'}
                    </button>
                  </div>
                </div>

                {scheduleEditMode && (
                  <div className="mb-4 grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <div className="flex items-stretch gap-2">
                      <button
                        onClick={handleCreateScheduleShare}
                        disabled={creatingScheduleShare || scheduleEntries.length === 0}
                        className="flex-1 py-2.5 px-3 rounded-lg bg-white/5 border border-white/15 text-gray-200 hover:bg-white/10 transition-all disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                      >
                        <Share2 className="w-4 h-4" />
                        {creatingScheduleShare ? 'Link wird erstellt...' : 'Stundenplan teilen'}
                      </button>
                      <button
                        onClick={handleRevokeScheduleShares}
                        disabled={creatingScheduleShare}
                        title="Alle von dir erstellten Share-Links widerrufen"
                        className="py-2.5 px-3 rounded-lg bg-white/5 border border-white/15 text-gray-300 hover:bg-red-500/20 hover:text-red-200 transition-all disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                      <input
                        type="text"
                        value={scheduleShareInput}
                        onChange={(event) => setScheduleShareInput(event.target.value)}
                        placeholder="Share-Link einfügen"
                        className="w-full p-2.5 rounded-lg bg-white/5 border border-white/10 focus:border-cyan-500 focus:outline-none text-sm"
                      />
                      <button
                        onClick={handleImportSharedSchedule}
                        disabled={importingScheduleShare || !scheduleShareInput.trim()}
                        className="w-full sm:w-auto py-2.5 px-3 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white transition-all disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-1"
                      >
                        <Download className="w-4 h-4" />
                        {importingScheduleShare ? 'Import...' : 'Import'}
                      </button>
                    </div>
                  </div>
                )}

                {scheduleEntries.length === 0 ? (
                  <div className="p-6 rounded-xl bg-white/5 border border-white/10 text-center text-gray-400 text-sm">
                    Noch keine Stundenplan-Einträge vorhanden.
                  </div>
                ) : (
                  <>
                    <div className="mb-4 flex flex-wrap gap-2">
                      {WEEKDAY_ORDER.map((weekday) => {
                        const isActive = scheduleViewWeekday === weekday;
                        return (
                          <button
                            key={weekday}
                            onClick={() => {
                              setScheduleViewWeekday(weekday);
                              if (scheduleEditMode) {
                                setScheduleWeekday(weekday);
                              }
                            }}
                            className={`px-3 py-1.5 rounded-lg border text-xs transition-all ${
                              isActive
                                ? 'bg-cyan-500/20 border-cyan-400/40 text-cyan-200'
                                : 'bg-white/5 border-white/15 text-gray-200 hover:bg-white/10'
                            }`}
                          >
                            {WEEKDAY_LABELS[weekday]}
                          </button>
                        );
                      })}
                    </div>

                    <div className="max-h-[62vh] overflow-y-auto pr-1">
                      <div className="rounded-xl border border-white/10 bg-white/5 p-4 appointment-item-animate">
                        <h3 className="text-sm font-semibold text-gray-200 mb-3">{WEEKDAY_LABELS[scheduleViewWeekday]}</h3>

                        {selectedScheduleDayEntries.length === 0 ? (
                          <p className="text-xs text-gray-500">Keine Einträge</p>
                        ) : (
                          <div className="space-y-2">
                            {selectedScheduleDayEntries.map((entry, entryIndex) => {
                              const relatedSubject = getRelatedSubject(entry.subjects);
                              const isBreakEntry = Boolean(entry.is_break);
                              const isFreePeriodEntry = isBreakEntry && entry.room === SCHEDULE_BREAK_KIND_FREE;
                              const displayRoom = entry.room || relatedSubject?.default_room || '—';
                              const displayTeacher = entry.teacher || relatedSubject?.default_teacher || '—';
                              return (
                              <div
                                key={entry.id}
                                className={`p-3 rounded-lg border appointment-item-animate ${
                                  isBreakEntry
                                    ? isFreePeriodEntry
                                      ? 'bg-gradient-to-r from-fuchsia-400/5 to-indigo-300/5 border-fuchsia-300/10'
                                      : 'bg-gradient-to-r from-fuchsia-500/10 to-cyan-500/10 border-fuchsia-400/20'
                                    : 'bg-black/20 border-white/10'
                                }`}
                                style={{ animationDelay: `${Math.min(entryIndex * 40, 280)}ms` }}
                              >
                                <div className="flex items-start justify-between gap-3">
                                  <div className="min-w-0">
                                    <div className="flex items-center gap-2 mb-1">
                                      {isBreakEntry ? (
                                        <span
                                          className={`w-2.5 h-2.5 rounded-full ${
                                            isFreePeriodEntry
                                              ? 'bg-gradient-to-r from-fuchsia-400/70 to-indigo-300/70'
                                              : 'bg-gradient-to-r from-fuchsia-500 to-cyan-400'
                                          }`}
                                        ></span>
                                      ) : (
                                        <span
                                          className="w-2.5 h-2.5 rounded-full"
                                          style={{ backgroundColor: relatedSubject?.color || '#3b82f6' }}
                                        ></span>
                                      )}
                                      <p
                                        className={`text-sm font-medium ${
                                          isBreakEntry
                                            ? isFreePeriodEntry
                                              ? 'bg-gradient-to-r from-fuchsia-200 to-indigo-200 bg-clip-text text-transparent'
                                              : 'bg-gradient-to-r from-fuchsia-300 to-cyan-300 bg-clip-text text-transparent'
                                            : ''
                                        }`}
                                      >
                                        {isBreakEntry ? (isFreePeriodEntry ? 'Freistunde' : 'Pause') : relatedSubject?.name || 'Fach'}
                                      </p>
                                    </div>
                                    <p className="text-xs text-gray-300">
                                      {formatScheduleTime(entry.start_time)} - {formatScheduleTime(entry.end_time)}
                                    </p>
                                    {!isBreakEntry && (
                                      <div className="text-xs text-gray-400 mt-1 flex flex-wrap gap-3">
                                        <span>Raum: {displayRoom}</span>
                                        <span>Lehrkraft: {displayTeacher}</span>
                                      </div>
                                    )}
                                  </div>
                                  {scheduleEditMode && (
                                    <button
                                      onClick={() => handleDeleteScheduleEntry(entry.id)}
                                      disabled={deletingScheduleId === entry.id}
                                      className="shrink-0 p-2 rounded-lg bg-red-500/15 text-red-300 hover:bg-red-500/25 transition-colors disabled:opacity-60"
                                      aria-label="Stundenplan-Eintrag löschen"
                                    >
                                      <Trash2 className="w-4 h-4" />
                                    </button>
                                  )}
                                </div>
                              </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'appointments' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 content-fade-in">
            <div className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-2xl p-6 lg:col-span-1 card-stagger-1">
              <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                <Plus className="w-5 h-5" /> {editingAppointmentId ? 'Termin bearbeiten' : 'Termin eintragen'}
              </h2>

              <div className="space-y-4">
                <div className="field modal-field-1">
                  <input
                    className="focus-glow px-4 py-3 rounded-xl text-white placeholder-transparent w-full"
                    type="text"
                    placeholder=" "
                    value={appointmentName}
                    onChange={(e) => setAppointmentName(e.target.value)}
                  />
                  <label>Name</label>
                </div>

                <div className="field modal-field-2">
                  <textarea
                    className="focus-glow px-4 py-3 rounded-xl text-white placeholder-transparent w-full min-h-[100px]"
                    placeholder=" "
                    value={appointmentDescription}
                    onChange={(e) => setAppointmentDescription(e.target.value)}
                  />
                  <label>Beschreibung</label>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 modal-field-3">
                  <div className="field">
                    <input
                      className="focus-glow px-4 py-3 rounded-xl text-white placeholder-transparent w-full"
                      type="date"
                      placeholder=" "
                      value={appointmentDate}
                      onChange={(e) => setAppointmentDate(e.target.value)}
                    />
                    <label>Termin</label>
                  </div>

                  <div className="field">
                    <input
                      className="focus-glow px-4 py-3 rounded-xl text-white placeholder-transparent w-full"
                      type="time"
                      placeholder=" "
                      value={appointmentTime}
                      onChange={(e) => setAppointmentTime(e.target.value)}
                    />
                    <label>Uhrzeit</label>
                  </div>
                </div>

                <div className="flex items-center justify-between rounded-xl border border-white/10 bg-white/5 px-4 py-3 modal-field-4">
                  <span className="text-sm text-gray-300">Farbe</span>
                  <input
                    type="color"
                    value={appointmentColor}
                    onChange={(e) => setAppointmentColor(e.target.value)}
                    className="h-8 w-12 bg-transparent border border-white/20 rounded cursor-pointer"
                  />
                </div>

                <div className="flex gap-3 modal-buttons-animate">
                  {editingAppointmentId && (
                    <button
                      onClick={resetAppointmentForm}
                      disabled={savingAppointment}
                      className="w-1/3 py-2 rounded-lg bg-white/10 hover:bg-white/20 border border-white/20 text-white font-medium transition-all disabled:opacity-50"
                    >
                      Abbrechen
                    </button>
                  )}

                  <button
                    onClick={editingAppointmentId ? handleUpdateAppointment : handleCreateAppointment}
                    disabled={savingAppointment}
                    className="w-full py-2 rounded-lg bg-blue-500 hover:bg-blue-600 text-white font-medium transition-all disabled:opacity-50"
                  >
                    {savingAppointment
                      ? 'Speichert...'
                      : editingAppointmentId
                      ? 'Termin aktualisieren'
                      : 'Termin speichern'}
                  </button>
                </div>

                <div className="rounded-xl border border-white/10 bg-white/5 p-4 modal-field-5">
                  <p className="text-sm font-medium text-white mb-2">Push-Erinnerungen</p>
                  <p className="text-xs text-gray-400 mb-3">
                    Geplant: Erinnerungen 1 Woche und 1 Tag vor einem Termin.
                  </p>
                  <p className="text-xs text-yellow-300 mb-3">
                    {NOTIFICATIONS_DEV_NOTICE}
                  </p>

                  {pushSubscribed ? (
                    <button
                      onClick={handleDisablePush}
                      disabled
                      className="w-full py-2 rounded-lg bg-white/10 hover:bg-white/20 border border-white/20 text-white font-medium transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                      <BellOff className="w-4 h-4" />
                      In Entwicklung
                    </button>
                  ) : (
                    <button
                      onClick={handleEnablePush}
                      disabled
                      className="w-full py-2 rounded-lg bg-blue-500 hover:bg-blue-600 text-white font-medium transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                      <Bell className="w-4 h-4" />
                      In Entwicklung
                    </button>
                  )}
                </div>
              </div>
            </div>

            <div className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-2xl p-6 lg:col-span-2 card-stagger-2">
              <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                <Calendar className="w-5 h-5" /> Anstehende Termine
              </h2>

              <div className="space-y-3">
                {upcomingAppointments.length === 0 ? (
                  <p className="text-sm text-gray-400">Noch keine Termine vorhanden</p>
                ) : (
                  upcomingAppointments.map((appointment, index) => (
                    <div
                      key={appointment.id}
                      className="flex flex-col md:flex-row md:items-start justify-between gap-3 p-3 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 transition-all duration-300 hover:scale-[1.01] appointment-item-animate"
                      style={{ animationDelay: `${Math.min(index * 70, 560)}ms` }}
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: appointment.color }}></span>
                          <p className="font-medium truncate">{appointment.name}</p>
                        </div>
                        <p className="text-xs text-gray-400 mt-1 flex flex-col md:flex-row md:items-center gap-1">
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {new Date(appointment.starts_at).toLocaleDateString('de-DE')}
                          </span>
                          <span className="hidden md:inline">·</span>
                          <span>{new Date(appointment.starts_at).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })}</span>
                        </p>
                        {appointment.description && (
                          <p className="text-sm text-gray-300 mt-2 break-words">{appointment.description}</p>
                        )}
                      </div>

                      <div className="flex items-center gap-2 flex-shrink-0">
                        <button
                          onClick={() => handleStartEditAppointment(appointment)}
                          className="p-2 rounded-lg hover:bg-blue-500/20 border border-transparent hover:border-blue-400/30 transition-all"
                          title="Termin bearbeiten"
                        >
                          <Edit className="w-4 h-4 text-blue-300" />
                        </button>

                        <button
                          onClick={() => handleDeleteAppointment(appointment.id)}
                          className="p-2 rounded-lg hover:bg-red-500/20 border border-transparent hover:border-red-400/30 transition-all"
                          title="Termin löschen"
                        >
                          <Trash2 className="w-4 h-4 text-red-300" />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'todos' && (
          <div className="content-fade-in">
            <TodosTab onChange={() => fetchTodosPreview()} />
          </div>
        )}

        {activeTab === 'subjects' && (
          <div className="content-fade-in">
            <GradesTab />
          </div>
        )}

        {activeTab === 'homework' && (
          <div className="content-fade-in">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-1 backdrop-blur-xl bg-white/5 border border-white/10 rounded-2xl p-5 h-fit card-stagger-1">
                <h2 className="text-lg font-semibold mb-4">Neue Hausaufgabe</h2>

                <div className="space-y-4">
                  <div className="modal-field-1">
                    <label className="block text-sm font-medium mb-2 text-gray-300">Fach</label>
                    <Select
                      value={homeworkSubjectId}
                      onChange={(v) => setHomeworkSubjectId(v)}
                      ariaLabel="Fach"
                      placeholder="Fach wählen"
                      options={homeworkSubjects.map((subject) => ({ value: subject.id, label: subject.name }))}
                    />
                  </div>

                  <div className="modal-field-2">
                    <label className="block text-sm font-medium mb-2 text-gray-300">Aufgabe</label>
                    <textarea
                      value={homeworkTask}
                      onChange={(event) => setHomeworkTask(event.target.value)}
                      rows={4}
                      placeholder="z.B. Kapitel 3 zusammenfassen"
                      className="w-full p-3 rounded-xl bg-white/5 border border-white/10 focus:border-cyan-500 focus:outline-none text-sm resize-none"
                    />
                  </div>

                  <div className="modal-field-3">
                    <label className="block text-sm font-medium mb-2 text-gray-300">Fällig am</label>
                    <input
                      type="date"
                      value={homeworkDueDate}
                      onChange={(event) => setHomeworkDueDate(event.target.value)}
                      className="w-full p-3 rounded-xl bg-white/5 border border-white/10 focus:border-cyan-500 focus:outline-none text-sm"
                    />
                  </div>

                  <div className="modal-field-4">
                    <label className="block text-sm font-medium mb-2 text-gray-300">Priorität</label>
                    <Select
                      value={homeworkPriority}
                      onChange={(v) => setHomeworkPriority(v as HomeworkItem['priority'])}
                      ariaLabel="Priorität"
                      options={[
                        { value: 'low', label: 'Niedrig' },
                        { value: 'medium', label: 'Mittel' },
                        { value: 'high', label: 'Hoch' },
                        { value: 'urgent', label: 'Dringend' },
                      ]}
                    />
                  </div>

                  <div className="modal-buttons-animate">
                    <button
                      onClick={handleCreateHomework}
                      disabled={savingHomework}
                      className="w-full py-3 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 text-white font-medium hover:from-cyan-500 hover:to-blue-500 transition-all disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                      {savingHomework ? 'Wird gespeichert...' : 'Hausaufgabe hinzufügen'}
                    </button>
                  </div>
                </div>
              </div>

              <div className="lg:col-span-2 backdrop-blur-xl bg-white/5 border border-white/10 rounded-2xl p-5 card-stagger-2">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold">Anstehende Hausaufgaben</h2>
                  <span className="text-xs px-2 py-1 rounded-full bg-white/10 text-gray-300">
                    {upcomingHomework.length} offen
                  </span>
                </div>

                {upcomingHomework.length === 0 ? (
                  <div className="p-6 rounded-xl bg-white/5 border border-white/10 text-center text-gray-400 text-sm">
                    Keine anstehenden Hausaufgaben.
                  </div>
                ) : (
                  <div className="space-y-3 max-h-[62vh] overflow-y-auto pr-1">
                    {upcomingHomework.map((item, index) => (
                      <div
                        key={item.id}
                        className="p-4 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-all duration-300 hover:scale-[1.01] appointment-item-animate"
                        style={{ animationDelay: `${Math.min(index * 70, 560)}ms` }}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="text-sm font-medium mb-1">{getRelatedSubject(item.subjects)?.name || 'Fach'}</p>
                            <p className="text-sm text-gray-300 break-words">{item.task}</p>
                            <div className="flex items-center gap-2 mt-2 text-xs text-gray-400 flex-wrap">
                              <span>Fällig: {new Date(item.due_date).toLocaleDateString('de-DE')}</span>
                              <span className="px-2 py-0.5 rounded-full bg-white/10">
                                Priorität: {item.priority}
                              </span>
                            </div>
                          </div>
                          <button
                            onClick={() => handleDeleteHomework(item.id)}
                            disabled={deletingHomeworkId === item.id}
                            className="shrink-0 p-2 rounded-lg bg-red-500/15 text-red-300 hover:bg-red-500/25 transition-colors disabled:opacity-60"
                            aria-label="Hausaufgabe löschen"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Bottom Navigation */}
      <div className="fixed bottom-0 left-0 right-0 z-20 backdrop-blur-md bg-gradient-to-t from-white/5 to-white/[0.02] border-t border-white/10 nav-bar-animate">
        <div className="max-w-7xl mx-auto px-6 py-2.5 flex justify-around items-center">
          {[
            { id: 'dashboard', label: 'Dashboard', Icon: BarChart3 },
            { id: 'todos', label: 'ToDos', Icon: ListTodo },
            { id: 'appointments', label: 'Termine', Icon: Calendar },
            { id: 'schedule', label: 'Stundenplan', Icon: Clock },
            { id: 'subjects', label: 'Fächer', Icon: BookOpen },
            { id: 'homework', label: 'Hausaufgaben', Icon: Edit },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex flex-col items-center gap-1 px-3 py-1.5 rounded-lg transition-all duration-300 nav-item-animate ${
                activeTab === tab.id
                  ? 'bg-gradient-to-br from-blue-500/40 to-purple-500/40 border border-blue-400/50 text-white shadow-lg shadow-blue-500/20'
                  : 'text-gray-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <tab.Icon className={`w-5 h-5 ${activeTab === tab.id ? 'icon-pulse' : ''}`} />
              <span className="text-xs font-medium hidden sm:inline">{tab.label}</span>
            </button>
          ))}
          <button
            onClick={() => router.push('/settings')}
            title="Einstellungen"
            className={`flex flex-col items-center gap-1 px-3 py-1.5 rounded-lg transition-all duration-300 nav-item-animate text-gray-400 hover:text-white hover:bg-white/5`}
          >
            <Settings className="w-5 h-5" />
            <span className="text-xs font-medium hidden sm:inline">Einstellungen</span>
          </button>
        </div>
      </div>



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
