'use client';
import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import AuthBackground from '@/app/components/common/AuthBackground';
import LoadingScreen from '@/app/components/common/LoadingScreen';
import Toast from '@/app/components/common/Toast';
import GradesTab from '@/app/components/grades/GradesTab';
import { Settings, CheckSquare, BookOpen, BarChart3, Calendar, Zap, Edit, UtensilsCrossed, ListTodo, Shield, AlertTriangle, X, Clock, Plus, Trash2, Bell, BellOff } from 'lucide-react';

type User = {
  id: string;
  email?: string;
};

type Profile = {
  first_name: string;
  last_name: string;
  class_name: string;
  birthdate: string;
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

export default function Dashboard() {
  const FIXED_SCHOOL_NAME = 'Gymnasium Weilheim i.OB';
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [todos, setTodos] = useState<Todo[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
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
  const [pushSupported, setPushSupported] = useState(false);
  const [pushSubscribed, setPushSubscribed] = useState(false);
  const [pushLoading, setPushLoading] = useState(false);
  const [subscriptionEndpoint, setSubscriptionEndpoint] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const supabase = createClient();
  const router = useRouter();

  const extractFirstName = (value?: string) => {
    return String(value || '').trim().split(/\s+/)[0] || '';
  };

  const toDisplayName = (value?: string) => {
    const firstName = extractFirstName(value);
    if (!firstName) return '';
    return firstName.charAt(0).toUpperCase() + firstName.slice(1).toLowerCase();
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

  const fetchAppointments = async (limit = 5) => {
    try {
      const response = await fetch(`/api/appointments?upcoming=true&limit=${limit}`);
      if (!response.ok) {
        return;
      }

      const data = await response.json();
      setAppointments(data.appointments || []);
    } catch (error) {
      console.error('Error fetching appointments:', error);
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
    const getSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          router.push('/login');
          return;
        }

        setUser(session.user);
        console.log('Session user:', session.user);

        // Fetch profile
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('first_name, last_name, class_name, birthdate, school, role')
          .eq('id', session.user.id)
          .single();

        if (profileError) {
          console.error('Profile fetch error:', profileError);
        }

        if (profileData) {
          const resolvedFirstName =
            toDisplayName(profileData.first_name) || getFallbackFirstName(session.user, profileData.last_name);
          const normalizedProfile = {
            ...profileData,
            first_name: resolvedFirstName,
            school: FIXED_SCHOOL_NAME,
          };

          console.log('Profile data:', profileData);
          setProfile(normalizedProfile);
          setIsAdmin(profileData.role === 'admin');
        } else {
            const fallbackFirstName = getFallbackFirstName(session.user);
              console.log('No profile data found');
              // Fallback: setze einen Namen aus Auth-Metadaten (oder E-Mail)
              setProfile({ 
                first_name: fallbackFirstName, 
                last_name: '', 
                class_name: '', 
                birthdate: '', 
                school: FIXED_SCHOOL_NAME 
              });
            }

        // Fetch todos
        try {
          const response = await fetch('/api/todos?limit=5&sortBy=priority&onlyIncomplete=true');
          if (response.ok) {
            const data = await response.json();
            setTodos(data.todos || []);
          }
        } catch (error) {
          console.error('Error fetching todos:', error);
        }

        // Fetch appointments
        await fetchAppointments(5);

        // Fetch maintenance messages
        try {
          const response = await fetch('/api/maintenance');
          if (response.ok) {
            const data = await response.json();
            setMaintenanceMessages(data.messages || []);
          }
        } catch (error) {
          console.error('Error fetching maintenance messages:', error);
        }

        
        setLoading(false);
      } catch (error) {
        console.error('Session error:', error);
        router.push('/login');
      }
    };

    getSession();
  }, []);

  useEffect(() => {
    if (activeTab === 'appointments') {
      fetchAppointments(100);
    }
  }, [activeTab]);

  useEffect(() => {
    initializePushState();
  }, []);

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

  const upcomingAppointments = appointments
    .filter((appointment) => new Date(appointment.starts_at).getTime() >= Date.now())
    .sort((a, b) => new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime());

  const previewAppointments = upcomingAppointments.slice(0, 5);

  if (loading) {
    return <LoadingScreen />;
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
        <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-start">
          <div>
            <p className="text-gray-400 text-sm">{formatDate()}</p>
            <h1 className="text-3xl font-semibold mt-2">
              {getGreeting()}, {toDisplayName(profile?.first_name) || 'Nutzer'}
            </h1>
          </div>

          <div className="flex gap-3">
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
      <div className="flex-1 overflow-y-auto z-10 max-w-7xl mx-auto w-full px-6 py-8 pb-24">
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
                onClick={() => router.push('/todos')}
                className="w-full mt-4 py-2 px-3 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 transition-all text-sm"
              >
                Alle ToDos anzeigen
              </button>
            </div>

            {/* Hausaufgaben */}
            <div className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-2xl p-6 card-stagger-2">
              <h2 className="text-xl font-semibold mb-4 flex items-center gap-2"><BookOpen className="w-5 h-5" /> Hausaufgaben</h2>
              <div className="space-y-3">
                {[
                  { subject: 'Deutsch', task: 'S. 145-150', due: 'Morgen' },
                  { subject: 'Physik', task: 'Aufgaben 1-5', due: 'Übermorgen' },
                  { subject: 'Geographie', task: 'Karte anfertigen', due: 'Freitag' },
                ].map((hw, i) => (
                  <div key={i} className="p-3 rounded-lg bg-white/5 border border-white/10">
                    <p className="text-sm font-medium">{hw.subject}</p>
                    <p className="text-xs text-gray-400 mt-1">{hw.task}</p>
                    <p className="text-xs text-orange-400 mt-1">Fällig: {hw.due}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Notendurchschnitt */}
            <div className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-2xl p-6 card-stagger-3">
              <h2 className="text-xl font-semibold mb-4 flex items-center gap-2"><BarChart3 className="w-5 h-5" /> Leistungen</h2>
              <div className="space-y-3">
                <div>
                  <div className="flex justify-between mb-2">
                    <span className="text-sm">Notendurchschnitt</span>
                    <span className="font-semibold">2.3</span>
                  </div>
                  <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
                    <div className="h-full w-3/4 bg-gradient-to-r from-green-400 to-blue-400"></div>
                  </div>
                </div>
                <div className="p-3 rounded-lg bg-white/5 border border-white/10 text-sm">
                  <p className="text-gray-400">Letzter Test</p>
                  <p className="text-lg font-semibold mt-1">Mathematik: 1.8</p>
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
          </div>
        )}

        {activeTab === 'schedule' && (
          <div className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-2xl p-8 text-center content-fade-in">
            <p className="text-gray-400">Stundenplan - Seite noch in Bearbeitung</p>
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
                    Du bekommst Erinnerungen automatisch 1 Woche und 1 Tag vor einem Termin.
                  </p>

                  {pushSubscribed ? (
                    <button
                      onClick={handleDisablePush}
                      disabled={pushLoading}
                      className="w-full py-2 rounded-lg bg-white/10 hover:bg-white/20 border border-white/20 text-white font-medium transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                      <BellOff className="w-4 h-4" />
                      {pushLoading ? 'Wird deaktiviert...' : 'Push deaktivieren'}
                    </button>
                  ) : (
                    <button
                      onClick={handleEnablePush}
                      disabled={pushLoading || !pushSupported}
                      className="w-full py-2 rounded-lg bg-blue-500 hover:bg-blue-600 text-white font-medium transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                      <Bell className="w-4 h-4" />
                      {!pushSupported
                        ? 'Push nicht unterstützt'
                        : pushLoading
                        ? 'Wird aktiviert...'
                        : 'Push aktivieren'}
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

        {activeTab === 'subjects' && (
          <div className="content-fade-in">
            <GradesTab />
          </div>
        )}

        {activeTab === 'homework' && (
          <div className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-2xl p-8 text-center content-fade-in">
            <p className="text-gray-400">Hausaufgaben - Seite noch in Bearbeitung</p>
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
            { id: 'schedule', label: 'Stundenplan', Icon: BookOpen },
            { id: 'subjects', label: 'Fächer', Icon: BookOpen },
            { id: 'homework', label: 'Hausaufgaben', Icon: Edit },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => {
                if (tab.id === 'todos') {
                  router.push('/todos');
                } else {
                  setActiveTab(tab.id);
                }
              }}
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
