'use client';

import { useEffect, useMemo, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import AuthBackground from '@/app/components/common/AuthBackground';
import LoadingScreen from '@/app/components/common/LoadingScreen';
import Toast from '@/app/components/common/Toast';
import SubjectListSettings from '@/app/components/grades/SubjectListSettings';
import {
  ArrowLeft,
  Bell,
  BellOff,
  Shield,
  User,
  BookOpen,
  LogOut,
  GraduationCap,
  FileText,
  Building2,
} from 'lucide-react';

type Profile = {
  first_name: string;
  last_name: string;
  class_name: string;
  birthdate: string;
  school: string;
  role?: 'user' | 'admin';
};

type User = {
  id: string;
  email?: string;
};

type SchoolYear = {
  id: string;
  label: string;
  grade_level: number | null;
  is_active: boolean;
  created_at: string;
};

type SchoolYearDeleteConfirm = {
  id: string;
  label: string;
};

const extractFirstName = (value?: string) => {
  return String(value || '').trim().split(/\s+/)[0] || '';
};

const toDisplayName = (value?: string) => {
  const firstName = extractFirstName(value);
  if (!firstName) return '';
  return firstName.charAt(0).toUpperCase() + firstName.slice(1).toLowerCase();
};

export default function SettingsPage() {
  const FIXED_SCHOOL_NAME = 'Gymnasium Weilheim i.OB';
  const NOTIFICATIONS_DEV_NOTICE = 'Benachrichtigungen funktionieren aktuell noch nicht. Diese Funktion ist in Entwicklung.';
  const [user, setUser] = useState<User | null>(null);
  const [, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'profile' | 'notifications' | 'subjects' | 'school-years'>('profile');
  const [savingProfile, setSavingProfile] = useState(false);
  const [pushSupported, setPushSupported] = useState(false);
  const [pushSubscribed, setPushSubscribed] = useState(false);
  const [pushLoading, setPushLoading] = useState(false);
  const [subscriptionEndpoint, setSubscriptionEndpoint] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [schoolYears, setSchoolYears] = useState<SchoolYear[]>([]);
  const [schoolYearsLoading, setSchoolYearsLoading] = useState(false);
  const [creatingSchoolYear, setCreatingSchoolYear] = useState(false);
  const [activatingSchoolYearId, setActivatingSchoolYearId] = useState<string | null>(null);
  const [savingSchoolYearId, setSavingSchoolYearId] = useState<string | null>(null);
  const [deletingSchoolYearId, setDeletingSchoolYearId] = useState<string | null>(null);
  const [editingSchoolYearId, setEditingSchoolYearId] = useState<string | null>(null);
  const [deleteConfirmYear, setDeleteConfirmYear] = useState<SchoolYearDeleteConfirm | null>(null);
  const [newSchoolYearGrade, setNewSchoolYearGrade] = useState('');
  const [newSchoolYearLabel, setNewSchoolYearLabel] = useState('');
  const [editingSchoolYearNames, setEditingSchoolYearNames] = useState<Record<string, string>>({});
  const [editingSchoolYearGrades, setEditingSchoolYearGrades] = useState<Record<string, string>>({});
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // Profile form fields
  const [editFirstName, setEditFirstName] = useState('');
  const [editLastName, setEditLastName] = useState('');
  const [editClassName, setEditClassName] = useState('');
  const [editBirthdate, setEditBirthdate] = useState('');

  const supabase = useMemo(() => createClient(), []);
  const router = useRouter();

  const handleSaveProfile = async () => {
    if (!user) {
      setToast({ message: 'Benutzer nicht gefunden', type: 'error' });
      return;
    }

    setSavingProfile(true);
    const { error, data } = await supabase
      .from('profiles')
      .upsert({
        id: user.id,
        first_name: editFirstName,
        last_name: editLastName,
        class_name: editClassName,
        birthdate: editBirthdate,
        school: FIXED_SCHOOL_NAME,
      })
      .select('first_name, last_name, class_name, birthdate, school')
      .single();

    if (error) {
      setToast({ message: 'Fehler beim Speichern: ' + error.message, type: 'error' });
      setSavingProfile(false);
      return;
    }

    if (data) {
      const normalizedSavedProfile = {
        ...data,
        first_name: toDisplayName(data.first_name) || 'Nutzer',
        school: FIXED_SCHOOL_NAME,
      };

      setProfile(normalizedSavedProfile);
      setEditFirstName(normalizedSavedProfile.first_name || '');
      setEditLastName(normalizedSavedProfile.last_name || '');
      setEditClassName(normalizedSavedProfile.class_name || '');
      setEditBirthdate(normalizedSavedProfile.birthdate || '');
      setToast({ message: 'Profil aktualisiert!', type: 'success' });
    }

    setSavingProfile(false);
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
    if (typeof window === 'undefined' || !('serviceWorker' in navigator) || !('PushManager' in window) || !('Notification' in window)) {
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

      const response = await fetch('/api/push-subscriptions', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ endpoint }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Fehler beim Deaktivieren von Push');
      }

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

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    if (typeof window !== 'undefined') {
      localStorage.removeItem('sb_auth_session');
    }
    router.push('/login');
  };

  const fetchSchoolYears = async () => {
    setSchoolYearsLoading(true);
    try {
      const response = await fetch('/api/school-years');
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Schuljahre konnten nicht geladen werden');
      }

      const data = await response.json();
      const loadedYears = Array.isArray(data.schoolYears) ? data.schoolYears : [];
      setSchoolYears(loadedYears);
      setEditingSchoolYearNames(
        loadedYears.reduce((acc: Record<string, string>, year: SchoolYear) => {
          acc[year.id] = year.label;
          return acc;
        }, {})
      );
      setEditingSchoolYearGrades(
        loadedYears.reduce((acc: Record<string, string>, year: SchoolYear) => {
          acc[year.id] = year.grade_level ? String(year.grade_level) : '';
          return acc;
        }, {})
      );
    } catch (error: unknown) {
      setToast({ message: error instanceof Error ? error.message : 'Unbekannter Fehler', type: 'error' });
    } finally {
      setSchoolYearsLoading(false);
    }
  };

  const handleCreateSchoolYear = async () => {
    const grade = newSchoolYearGrade.trim();
    const parsedGrade = grade ? Number(grade) : null;

    if (parsedGrade !== null && (!Number.isInteger(parsedGrade) || parsedGrade < 1 || parsedGrade > 13)) {
      setToast({ message: 'Jahrgangsstufe muss zwischen 1 und 13 liegen', type: 'error' });
      return;
    }

    setCreatingSchoolYear(true);
    try {
      const response = await fetch('/api/school-years', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          gradeLevel: parsedGrade,
          label: newSchoolYearLabel.trim() || undefined,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Schuljahr konnte nicht erstellt werden');
      }

      setNewSchoolYearGrade('');
      setNewSchoolYearLabel('');
      await fetchSchoolYears();
      setToast({ message: 'Neues Schuljahr erstellt und aktiviert', type: 'success' });
    } catch (error: unknown) {
      setToast({ message: error instanceof Error ? error.message : 'Unbekannter Fehler', type: 'error' });
    } finally {
      setCreatingSchoolYear(false);
    }
  };

  const handleActivateSchoolYear = async (schoolYearId: string) => {
    setActivatingSchoolYearId(schoolYearId);
    try {
      const response = await fetch(`/api/school-years/${schoolYearId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ setActive: true }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Schuljahr konnte nicht aktiviert werden');
      }

      await fetchSchoolYears();
      setToast({ message: 'Schuljahr gewechselt. Daten werden jetzt nach diesem Schuljahr gefiltert.', type: 'success' });
    } catch (error: unknown) {
      setToast({ message: error instanceof Error ? error.message : 'Unbekannter Fehler', type: 'error' });
    } finally {
      setActivatingSchoolYearId(null);
    }
  };

  const handleSaveSchoolYear = async (schoolYear: SchoolYear) => {
    const nextLabel = String(editingSchoolYearNames[schoolYear.id] || '').trim();
    const nextGradeRaw = String(editingSchoolYearGrades[schoolYear.id] || '').trim();
    const nextGrade = nextGradeRaw ? Number(nextGradeRaw) : null;

    if (!nextLabel) {
      setToast({ message: 'Bitte einen Namen für das Schuljahr eingeben.', type: 'error' });
      return;
    }

    if (nextGrade !== null && (!Number.isInteger(nextGrade) || nextGrade < 1 || nextGrade > 13)) {
      setToast({ message: 'Jahrgangsstufe muss zwischen 1 und 13 liegen.', type: 'error' });
      return;
    }

    if (nextLabel === schoolYear.label && nextGrade === schoolYear.grade_level) {
      setEditingSchoolYearId(null);
      return;
    }

    setSavingSchoolYearId(schoolYear.id);
    try {
      const response = await fetch(`/api/school-years/${schoolYear.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          label: nextLabel,
          gradeLevel: nextGrade,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Schuljahr konnte nicht umbenannt werden');
      }

      await fetchSchoolYears();
      setEditingSchoolYearId(null);
      setToast({ message: 'Schuljahr aktualisiert.', type: 'success' });
    } catch (error: unknown) {
      setToast({ message: error instanceof Error ? error.message : 'Unbekannter Fehler', type: 'error' });
    } finally {
      setSavingSchoolYearId(null);
    }
  };

  const handleDeleteSchoolYear = async (schoolYear: SchoolYear) => {
    if (schoolYears.length <= 1) {
      setToast({ message: 'Das letzte Schuljahr kann nicht gelöscht werden.', type: 'error' });
      return;
    }

    setDeletingSchoolYearId(schoolYear.id);
    try {
      const response = await fetch(`/api/school-years/${schoolYear.id}`, {
        method: 'DELETE',
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Schuljahr konnte nicht gelöscht werden');
      }

      await fetchSchoolYears();
      setDeleteConfirmYear(null);
      setToast({ message: 'Schuljahr gelöscht.', type: 'success' });
    } catch (error: unknown) {
      setToast({ message: error instanceof Error ? error.message : 'Unbekannter Fehler', type: 'error' });
    } finally {
      setDeletingSchoolYearId(null);
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
          const resolvedFirstName = toDisplayName(profileData.first_name) || 'Nutzer';
          const normalizedProfile = {
            ...profileData,
            first_name: resolvedFirstName,
            school: FIXED_SCHOOL_NAME,
          };

          setProfile(normalizedProfile);
          setIsAdmin(profileData.role === 'admin');
          setEditFirstName(normalizedProfile.first_name || '');
          setEditLastName(profileData.last_name || '');
          setEditClassName(profileData.class_name || '');
          setEditBirthdate(profileData.birthdate || '');
        }

        await fetchSchoolYears();

        setLoading(false);
      } catch (error) {
        console.error('Session error:', error);
        router.push('/login');
      }
    };

    getSession();
  }, [router, supabase]);

  useEffect(() => {
    initializePushState();
  }, []);

  if (loading) {
    return <LoadingScreen />;
  }

  return (
    <div className="fixed inset-0 bg-gradient-to-b from-[#0a0a0a] via-[#121212] to-[#1a1a1a] text-white flex flex-col overflow-hidden">
      <AuthBackground />

      <div className="relative z-10 flex-1 max-w-5xl w-full mx-auto px-6 pt-6 pb-24 flex flex-col overflow-hidden">
        <div className="sticky top-0 z-30 backdrop-blur-xl bg-[#0d0d0d]/70 rounded-b-2xl pb-5">
          {/* Header */}
          <div className="flex items-center gap-4 mb-5 card-stagger-1 pt-2">
            <button
              onClick={() => router.push('/dashboard')}
              className="p-2 rounded-lg hover:bg-white/10 transition-all border border-white/10 hover:scale-105"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <h1 className="text-4xl font-bold">Einstellungen</h1>
          </div>

          {/* Tab Navigation */}
          <div className="flex gap-3 flex-wrap justify-center sm:justify-start card-stagger-2">
            <button
              onClick={() => setActiveTab('profile')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all border hover:scale-105 ${
                activeTab === 'profile'
                  ? 'bg-gradient-to-r from-blue-500/40 to-purple-500/40 border-blue-400/50 text-white shadow-lg shadow-blue-500/20'
                  : 'bg-white/5 border-white/10 hover:bg-white/10 text-gray-300'
              }`}
            >
              <User className="w-4 h-4" />
              Profil
            </button>
            <button
              onClick={() => setActiveTab('subjects')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all border hover:scale-105 ${
                activeTab === 'subjects'
                  ? 'bg-gradient-to-r from-blue-500/40 to-purple-500/40 border-blue-400/50 text-white shadow-lg shadow-blue-500/20'
                  : 'bg-white/5 border-white/10 hover:bg-white/10 text-gray-300'
              }`}
            >
              <BookOpen className="w-4 h-4" />
              Fächer
            </button>
            <button
              onClick={() => setActiveTab('notifications')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all border hover:scale-105 ${
                activeTab === 'notifications'
                  ? 'bg-gradient-to-r from-blue-500/40 to-purple-500/40 border-blue-400/50 text-white shadow-lg shadow-blue-500/20'
                  : 'bg-white/5 border-white/10 hover:bg-white/10 text-gray-300'
              }`}
            >
              <Bell className="w-4 h-4" />
              Benachrichtigungen (in Entwicklung)
            </button>
            <button
              onClick={() => setActiveTab('school-years')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all border hover:scale-105 ${
                activeTab === 'school-years'
                  ? 'bg-gradient-to-r from-blue-500/40 to-purple-500/40 border-blue-400/50 text-white shadow-lg shadow-blue-500/20'
                  : 'bg-white/5 border-white/10 hover:bg-white/10 text-gray-300'
              }`}
            >
              <GraduationCap className="w-4 h-4" />
              Schuljahre
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto overflow-x-hidden pt-6 pb-8">

          {/* Profile Tab */}
          {activeTab === 'profile' && (
            <div className="space-y-6 card-stagger-3">
              <div className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-2xl p-8 content-fade-in">
                <h2 className="text-2xl font-semibold mb-6 flex items-center gap-2">
                  <User className="w-6 h-6" />
                  Profilinformationen
                </h2>
                <div className="space-y-4">
                    <div className="field modal-field-1">
                    <input
                      className="focus-glow px-4 py-3 rounded-xl text-white placeholder-transparent w-full bg-white/5 border border-white/10 transform transition-all hover:scale-[1.01] duration-200"
                      type="text"
                      placeholder=" "
                      value={editFirstName}
                      onChange={e => setEditFirstName(e.target.value)}
                    />
                    <label>Vorname</label>
                  </div>

                    <div className="field modal-field-2">
                    <input
                      className="focus-glow px-4 py-3 rounded-xl text-white placeholder-transparent w-full bg-white/5 border border-white/10 transform transition-all hover:scale-[1.01] duration-200"
                      type="text"
                      placeholder=" "
                      value={editLastName}
                      onChange={e => setEditLastName(e.target.value)}
                    />
                    <label>Nachname</label>
                  </div>

                    <div className="field modal-field-3">
                    <input
                      className="focus-glow px-4 py-3 rounded-xl text-white placeholder-transparent w-full bg-white/5 border border-white/10 transform transition-all hover:scale-[1.01] duration-200"
                      type="text"
                      placeholder=" "
                      value={editClassName}
                      onChange={e => setEditClassName(e.target.value)}
                    />
                    <label>Klasse</label>
                  </div>

                    <div className="field modal-field-4">
                    <input
                      className="focus-glow px-4 py-3 rounded-xl text-white placeholder-transparent w-full bg-white/5 border border-white/10 transform transition-all hover:scale-[1.01] duration-200"
                      type="date"
                      placeholder=" "
                      value={editBirthdate}
                      onChange={e => setEditBirthdate(e.target.value)}
                    />
                    <label>Geburtstag</label>
                  </div>

                    <div className="field modal-field-5">
                    <input
                      className="focus-glow px-4 py-3 rounded-xl text-white placeholder-transparent w-full bg-white/5 border border-white/10"
                      type="text"
                      value={FIXED_SCHOOL_NAME}
                      disabled
                      readOnly
                    />
                    <label>Schule</label>
                  </div>

                    <div className="field modal-field-5">
                    <input
                      className="focus-glow px-4 py-3 rounded-xl text-white placeholder-transparent w-full bg-white/5 border border-white/10"
                      type="email"
                      value={user?.email || ''}
                      disabled
                      readOnly
                    />
                    <label>E-Mail</label>
                  </div>
                </div>

                  <div className="flex gap-3 mt-8 modal-buttons-animate">
                  <button
                    onClick={handleSaveProfile}
                    disabled={savingProfile}
                    className="flex-1 py-3 rounded-lg bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white font-medium transition-all disabled:opacity-50 transform hover:scale-[1.02] active:scale-[0.98] duration-200"
                  >
                    {savingProfile ? 'Speichern...' : 'Änderungen speichern'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Subjects Tab */}
          {activeTab === 'subjects' && (
            <div className="space-y-6 card-stagger-3">
              <div className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-2xl p-8 content-fade-in">
                <SubjectListSettings />
              </div>
            </div>
          )}

          {/* Notifications Tab */}
          {activeTab === 'notifications' && (
            <div className="space-y-6 card-stagger-3">
              <div className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-2xl p-8 content-fade-in">
                <h2 className="text-2xl font-semibold mb-6 flex items-center gap-2">
                  <Bell className="w-6 h-6" />
                  Benachrichtigungen
                </h2>

                <div className="mb-4 p-4 rounded-lg bg-yellow-500/10 border border-yellow-500/20 content-fade-in">
                  <p className="text-yellow-300 text-sm">
                    {NOTIFICATIONS_DEV_NOTICE}
                  </p>
                </div>

                {!pushSupported ? (
                  <div className="p-4 rounded-lg bg-yellow-500/10 border border-yellow-500/20 content-fade-in">
                    <p className="text-yellow-300 text-sm">
                      Push-Benachrichtigungen werden von deinem Browser oder Gerät nicht unterstützt.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-4 rounded-lg bg-white/5 border border-white/10 content-fade-in transition-all hover:bg-white/10">
                      <div className="min-w-0">
                        <h3 className="font-medium text-white">Push-Benachrichtigungen</h3>
                        <p className="text-sm text-gray-400 mt-1">
                          Geplant: Benachrichtigungen zu Terminen und Meldungen direkt auf dein Gerät.
                        </p>
                      </div>
                      <button
                        onClick={pushSubscribed ? handleDisablePush : handleEnablePush}
                        disabled
                        className={`w-full sm:w-auto px-6 py-2 rounded-lg font-medium transition-all flex items-center justify-center gap-2 hover:-translate-y-0.5 active:translate-y-0 duration-200 ${
                          pushSubscribed
                            ? 'bg-red-500/20 hover:bg-red-500/30 border border-red-500/30 text-red-300'
                            : 'bg-green-500/20 hover:bg-green-500/30 border border-green-500/30 text-green-300'
                        } disabled:opacity-50`}
                      >
                        <>
                          <BellOff className="w-4 h-4" />
                          In Entwicklung
                        </>
                      </button>
                    </div>

                    {pushSubscribed && (
                      <div className="p-4 rounded-lg bg-green-500/10 border border-green-500/20 content-fade-in">
                        <p className="text-green-300 text-sm flex items-center gap-2">
                          <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></span>
                          Hinweis: Push-Benachrichtigungen sind noch in Entwicklung
                        </p>
                      </div>
                    )}

                    {!pushSubscribed && (
                      <div className="p-4 rounded-lg bg-gray-500/10 border border-gray-500/20 content-fade-in">
                        <p className="text-gray-300 text-sm flex items-center gap-2">
                          <span className="w-2 h-2 bg-gray-400 rounded-full"></span>
                          Push-Benachrichtigungen sind derzeit nicht verfuegbar (in Entwicklung)
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'school-years' && (
            <div className="space-y-6 card-stagger-3">
              <div className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-2xl p-8 content-fade-in">
                <h2 className="text-2xl font-semibold mb-6 flex items-center gap-2">
                  <GraduationCap className="w-6 h-6" />
                  Schuljahre
                </h2>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-6">
                  <input
                    type="number"
                    min="1"
                    max="13"
                    value={newSchoolYearGrade}
                    onChange={(e) => setNewSchoolYearGrade(e.target.value)}
                    className="w-full px-4 py-3 rounded-lg bg-white/5 border border-white/10 focus:outline-none focus:border-blue-500/40"
                    placeholder="Jahrgangsstufe (z.B. 10)"
                  />
                  <input
                    type="text"
                    value={newSchoolYearLabel}
                    onChange={(e) => setNewSchoolYearLabel(e.target.value)}
                    className="w-full px-4 py-3 rounded-lg bg-white/5 border border-white/10 focus:outline-none focus:border-blue-500/40"
                    placeholder="Label optional (z.B. Schuljahr 2026/27)"
                  />
                  <button
                    onClick={handleCreateSchoolYear}
                    disabled={creatingSchoolYear}
                    className="w-full py-3 rounded-lg bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white font-medium transition-all disabled:opacity-50"
                  >
                    {creatingSchoolYear ? 'Erstellen...' : 'Neues Schuljahr erstellen'}
                  </button>
                </div>

                {schoolYearsLoading ? (
                  <p className="text-sm text-gray-400">Schuljahre werden geladen...</p>
                ) : schoolYears.length === 0 ? (
                  <p className="text-sm text-gray-400">Noch keine Schuljahre vorhanden.</p>
                ) : (
                  <div className="space-y-3">
                    {schoolYears.map((year) => (
                      <div
                        key={year.id}
                        className="p-4 rounded-lg bg-white/5 border border-white/10 flex items-center justify-between gap-3"
                      >
                        <div className="flex-1 min-w-0">
                          {editingSchoolYearId === year.id ? (
                            <div className="space-y-2">
                              <input
                                type="text"
                                value={editingSchoolYearNames[year.id] || ''}
                                onChange={(e) =>
                                  setEditingSchoolYearNames((prev) => ({
                                    ...prev,
                                    [year.id]: e.target.value,
                                  }))
                                }
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') {
                                    e.preventDefault();
                                    handleSaveSchoolYear(year);
                                  }
                                }}
                                className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 focus:outline-none focus:border-blue-500/40 text-sm"
                                placeholder="Name"
                              />
                              <input
                                type="number"
                                min="1"
                                max="13"
                                value={editingSchoolYearGrades[year.id] || ''}
                                onChange={(e) =>
                                  setEditingSchoolYearGrades((prev) => ({
                                    ...prev,
                                    [year.id]: e.target.value,
                                  }))
                                }
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') {
                                    e.preventDefault();
                                    handleSaveSchoolYear(year);
                                  }
                                }}
                                className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 focus:outline-none focus:border-blue-500/40 text-sm"
                                placeholder="Jahrgangsstufe (1-13)"
                              />
                              <div className="flex items-center gap-2">
                                <button
                                  onClick={() => handleSaveSchoolYear(year)}
                                  disabled={savingSchoolYearId === year.id}
                                  className="px-3 py-2 rounded-lg text-xs bg-white/10 border border-white/20 hover:bg-white/20 transition-all disabled:opacity-50"
                                >
                                  {savingSchoolYearId === year.id ? 'Speichern...' : 'Speichern'}
                                </button>
                                <button
                                  onClick={() => {
                                    setEditingSchoolYearId(null);
                                    setEditingSchoolYearNames((prev) => ({ ...prev, [year.id]: year.label }));
                                    setEditingSchoolYearGrades((prev) => ({
                                      ...prev,
                                      [year.id]: year.grade_level ? String(year.grade_level) : '',
                                    }));
                                  }}
                                  className="px-3 py-2 rounded-lg text-xs bg-white/5 border border-white/15 hover:bg-white/10 transition-all"
                                >
                                  Abbrechen
                                </button>
                              </div>
                            </div>
                          ) : (
                            <>
                              <p className="font-medium text-white">{year.label}</p>
                              <p className="text-xs text-gray-400 mt-1">
                                {year.grade_level ? `${year.grade_level}. Jahrgangsstufe` : 'Ohne Jahrgangsstufe'}
                              </p>
                              <div className="flex items-center gap-2 mt-2">
                                <button
                                  onClick={() => setEditingSchoolYearId(year.id)}
                                  className="px-3 py-2 rounded-lg text-xs bg-white/10 border border-white/20 hover:bg-white/20 transition-all"
                                >
                                  Bearbeiten
                                </button>
                                <button
                                  onClick={() => setDeleteConfirmYear({ id: year.id, label: year.label })}
                                  disabled={deletingSchoolYearId === year.id || schoolYears.length <= 1}
                                  className="px-3 py-2 rounded-lg text-xs bg-red-500/20 border border-red-500/40 text-red-300 hover:bg-red-500/30 transition-all disabled:opacity-50"
                                >
                                  {deletingSchoolYearId === year.id ? 'Löschen...' : 'Löschen'}
                                </button>
                              </div>
                            </>
                          )}
                        </div>

                        {year.is_active ? (
                          <span className="px-3 py-1 rounded-full text-xs bg-green-500/20 border border-green-500/40 text-green-300">
                            Aktiv
                          </span>
                        ) : (
                          <button
                            onClick={() => handleActivateSchoolYear(year.id)}
                            disabled={activatingSchoolYearId === year.id}
                            className="px-3 py-1.5 rounded-lg text-xs bg-white/10 border border-white/20 hover:bg-white/20 transition-all disabled:opacity-50"
                          >
                            {activatingSchoolYearId === year.id ? 'Wechsel...' : 'Aktivieren'}
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Admin & Account Section */}
          <div className="mt-8 space-y-4 border-t border-white/10 pt-8 card-stagger-4">
            {isAdmin && (
              <button
                onClick={() => router.push('/admin')}
                className="w-full flex items-center justify-between p-4 rounded-lg bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/20 transition-all group hover:-translate-y-0.5 active:translate-y-0 duration-200"
              >
                <div className="flex items-center gap-3 text-left">
                  <Shield className="w-5 h-5 text-blue-400 group-hover:scale-110 transition-transform" />
                  <div>
                    <p className="font-medium text-white">Admin-Bereich</p>
                    <p className="text-sm text-gray-400">Wartungsmodus, Nutzerrechte und Wartungsmeldungen verwalten</p>
                  </div>
                </div>
                <span className="text-gray-400 group-hover:text-white transition-colors">→</span>
              </button>
            )}

            <button
              onClick={() => router.push('/impressum')}
              className="w-full flex items-center justify-between p-4 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 transition-all group hover:-translate-y-0.5 active:translate-y-0 duration-200"
            >
              <div className="flex items-center gap-3 text-left">
                <Building2 className="w-5 h-5 text-gray-300 group-hover:scale-110 transition-transform" />
                <div>
                  <p className="font-medium text-white">Impressum</p>
                  <p className="text-sm text-gray-400">Anbieterkennzeichnung und Kontaktangaben</p>
                </div>
              </div>
              <span className="text-gray-400 group-hover:text-white transition-colors">→</span>
            </button>

            <button
              onClick={() => router.push('/privacy')}
              className="w-full flex items-center justify-between p-4 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 transition-all group hover:-translate-y-0.5 active:translate-y-0 duration-200"
            >
              <div className="flex items-center gap-3 text-left">
                <FileText className="w-5 h-5 text-gray-300 group-hover:scale-110 transition-transform" />
                <div>
                  <p className="font-medium text-white">Datenschutz & Hinweise</p>
                  <p className="text-sm text-gray-400">Informationen zur Datenverarbeitung und privaten Nutzung</p>
                </div>
              </div>
              <span className="text-gray-400 group-hover:text-white transition-colors">→</span>
            </button>

            <button
              onClick={handleSignOut}
              className="w-full flex items-center justify-between p-4 rounded-lg bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 transition-all group hover:-translate-y-0.5 active:translate-y-0 duration-200"
            >
              <div className="flex items-center gap-3 text-left">
                <LogOut className="w-5 h-5 text-red-400 group-hover:scale-110 transition-transform" />
                <div>
                  <p className="font-medium text-white">Abmelden</p>
                  <p className="text-sm text-gray-400">Melde dich von deinem Konto ab</p>
                </div>
              </div>
              <span className="text-gray-400 group-hover:text-white transition-colors">→</span>
            </button>
          </div>
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

      {deleteConfirmYear && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[80] modal-backdrop-animate">
          <div className="bg-gradient-to-b from-[#1a1a1a] to-[#0f0f0f] border border-white/10 rounded-2xl p-6 max-w-md w-full mx-4 modal-animate">
            <h2 className="text-xl font-semibold mb-3">Schuljahr löschen?</h2>
            <p className="text-gray-300 leading-relaxed">
              Möchtest du das Schuljahr "{deleteConfirmYear.label}" wirklich löschen? Alle zugehörigen Daten in diesem Schuljahr werden entfernt.
            </p>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => {
                  if (deletingSchoolYearId) return;
                  setDeleteConfirmYear(null);
                }}
                disabled={Boolean(deletingSchoolYearId)}
                className="flex-1 py-2.5 rounded-lg bg-white/10 hover:bg-white/20 border border-white/20 transition-all disabled:opacity-60"
              >
                Abbrechen
              </button>
              <button
                onClick={async () => {
                  const year = schoolYears.find((item) => item.id === deleteConfirmYear.id);
                  if (!year) {
                    setDeleteConfirmYear(null);
                    return;
                  }
                  await handleDeleteSchoolYear(year);
                }}
                disabled={Boolean(deletingSchoolYearId)}
                className="flex-1 py-2.5 rounded-lg transition-all disabled:opacity-60 bg-red-500/80 hover:bg-red-500 text-white"
              >
                {deletingSchoolYearId ? 'Bitte warten...' : 'Löschen'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
