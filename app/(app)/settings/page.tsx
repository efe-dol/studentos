'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import AuthBackground from '@/app/components/common/AuthBackground';
import LoadingScreen from '@/app/components/common/LoadingScreen';
import Toast from '@/app/components/common/Toast';
import {
  ArrowLeft,
  Bell,
  BellOff,
  Shield,
  User,
  BookOpen,
  LogOut,
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

export default function SettingsPage() {
  const FIXED_SCHOOL_NAME = 'Gymnasium Weilheim i.OB';
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'profile' | 'notifications'>('profile');
  const [savingProfile, setSavingProfile] = useState(false);
  const [pushSupported, setPushSupported] = useState(false);
  const [pushSubscribed, setPushSubscribed] = useState(false);
  const [pushLoading, setPushLoading] = useState(false);
  const [subscriptionEndpoint, setSubscriptionEndpoint] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // Profile form fields
  const [editFirstName, setEditFirstName] = useState('');
  const [editLastName, setEditLastName] = useState('');
  const [editClassName, setEditClassName] = useState('');
  const [editBirthdate, setEditBirthdate] = useState('');
  const [editSchool, setEditSchool] = useState('');

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
      setEditSchool(FIXED_SCHOOL_NAME);
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

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    if (typeof window !== 'undefined') {
      localStorage.removeItem('sb_auth_session');
    }
    router.push('/login');
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
          setEditSchool(FIXED_SCHOOL_NAME);
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
    initializePushState();
  }, []);

  if (loading) {
    return <LoadingScreen />;
  }

  return (
    <div className="fixed inset-0 bg-gradient-to-b from-[#0a0a0a] via-[#121212] to-[#1a1a1a] text-white flex flex-col animate-in fade-in duration-300">
      <AuthBackground />

      {/* Header */}
      <div className="relative z-10 border-b border-white/10 backdrop-blur-xl bg-white/5 animate-in fade-in slide-in-from-top-2 duration-500">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center gap-4">
          <button
            onClick={() => router.push('/dashboard')}
            className="p-2 rounded-lg hover:bg-white/10 transition-all border border-white/10 hover:scale-105 duration-200"
          >
            <ArrowLeft className="w-5 h-5 animate-in fade-in duration-500" />
          </button>
          <h1 className="text-3xl font-semibold animate-in fade-in slide-in-from-left-4 duration-500 delay-100">Einstellungen</h1>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto z-10">
        <div className="max-w-4xl mx-auto px-6 py-8 pb-24">
          {/* Tab Navigation */}
          <div className="flex gap-3 mb-8 flex-wrap animate-in fade-in slide-in-from-top-4 duration-500 delay-200">
            <button
              onClick={() => setActiveTab('profile')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all border transform hover:scale-105 duration-200 ${
                activeTab === 'profile'
                  ? 'bg-gradient-to-r from-blue-500/40 to-purple-500/40 border-blue-400/50 text-white shadow-lg shadow-blue-500/20 animate-in zoom-in-95 duration-300'
                  : 'bg-white/5 border-white/10 hover:bg-white/10 text-gray-300'
              }`}
            >
              <User className="w-4 h-4" />
              Profil
            </button>
            <button
              onClick={() => router.push('/subjects')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all border transform hover:scale-105 duration-200 bg-white/5 border-white/10 hover:bg-white/10 text-gray-300`}
            >
              <BookOpen className="w-4 h-4" />
              Fächer
            </button>
            <button
              onClick={() => setActiveTab('notifications')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all border transform hover:scale-105 duration-200 ${
                activeTab === 'notifications'
                  ? 'bg-gradient-to-r from-blue-500/40 to-purple-500/40 border-blue-400/50 text-white shadow-lg shadow-blue-500/20 animate-in zoom-in-95 duration-300'
                  : 'bg-white/5 border-white/10 hover:bg-white/10 text-gray-300'
              }`}
            >
              <Bell className="w-4 h-4" />
              Benachrichtigungen
            </button>
          </div>

          {/* Profile Tab */}
          {activeTab === 'profile' && (
            <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-400">
              <div className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-2xl p-8 animate-in zoom-in-95 duration-500 delay-100">
                <h2 className="text-2xl font-semibold mb-6 flex items-center gap-2 animate-in fade-in slide-in-from-left-4 duration-500">
                  <User className="w-6 h-6" />
                  Profilinformationen
                </h2>
                <div className="space-y-4">
                  <div className="field animate-in fade-in slide-in-from-left-4 duration-500 delay-100">
                    <input
                      className="focus-glow px-4 py-3 rounded-xl text-white placeholder-transparent w-full bg-white/5 border border-white/10 transform transition-all hover:scale-[1.01] duration-200"
                      type="text"
                      placeholder=" "
                      value={editFirstName}
                      onChange={e => setEditFirstName(e.target.value)}
                    />
                    <label>Vorname</label>
                  </div>

                  <div className="field animate-in fade-in slide-in-from-left-4 duration-500 delay-150">
                    <input
                      className="focus-glow px-4 py-3 rounded-xl text-white placeholder-transparent w-full bg-white/5 border border-white/10 transform transition-all hover:scale-[1.01] duration-200"
                      type="text"
                      placeholder=" "
                      value={editLastName}
                      onChange={e => setEditLastName(e.target.value)}
                    />
                    <label>Nachname</label>
                  </div>

                  <div className="field animate-in fade-in slide-in-from-left-4 duration-500 delay-200">
                    <input
                      className="focus-glow px-4 py-3 rounded-xl text-white placeholder-transparent w-full bg-white/5 border border-white/10 transform transition-all hover:scale-[1.01] duration-200"
                      type="text"
                      placeholder=" "
                      value={editClassName}
                      onChange={e => setEditClassName(e.target.value)}
                    />
                    <label>Klasse</label>
                  </div>

                  <div className="field animate-in fade-in slide-in-from-left-4 duration-500 delay-250">
                    <input
                      className="focus-glow px-4 py-3 rounded-xl text-white placeholder-transparent w-full bg-white/5 border border-white/10 transform transition-all hover:scale-[1.01] duration-200"
                      type="date"
                      placeholder=" "
                      value={editBirthdate}
                      onChange={e => setEditBirthdate(e.target.value)}
                    />
                    <label>Geburtstag</label>
                  </div>

                  <div className="field animate-in fade-in slide-in-from-left-4 duration-500 delay-300">
                    <input
                      className="focus-glow px-4 py-3 rounded-xl text-white placeholder-transparent w-full bg-white/5 border border-white/10"
                      type="text"
                      value={FIXED_SCHOOL_NAME}
                      disabled
                      readOnly
                    />
                    <label>Schule</label>
                  </div>

                  <div className="field animate-in fade-in slide-in-from-left-4 duration-500 delay-350">
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

                <div className="flex gap-3 mt-8 animate-in fade-in slide-in-from-bottom-4 duration-500 delay-400">
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

          {/* Notifications Tab */}
          {activeTab === 'notifications' && (
            <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-400">
              <div className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-2xl p-8 animate-in zoom-in-95 duration-500 delay-100">
                <h2 className="text-2xl font-semibold mb-6 flex items-center gap-2 animate-in fade-in slide-in-from-left-4 duration-500">
                  <Bell className="w-6 h-6" />
                  Benachrichtigungen
                </h2>

                {!pushSupported ? (
                  <div className="p-4 rounded-lg bg-yellow-500/10 border border-yellow-500/20 animate-in fade-in slide-in-from-left-4 duration-500">
                    <p className="text-yellow-300 text-sm">
                      Push-Benachrichtigungen werden von deinem Browser oder Gerät nicht unterstützt.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-4 rounded-lg bg-white/5 border border-white/10 animate-in fade-in slide-in-from-left-4 duration-500 delay-100 transform transition-all hover:bg-white/10 hover:scale-[1.01]">
                      <div>
                        <h3 className="font-medium text-white">Push-Benachrichtigungen</h3>
                        <p className="text-sm text-gray-400 mt-1">
                          Erhalte Benachrichtigungen zu Terminen und Meldungen direkt auf dein Gerät
                        </p>
                      </div>
                      <button
                        onClick={pushSubscribed ? handleDisablePush : handleEnablePush}
                        disabled={pushLoading}
                        className={`px-6 py-2 rounded-lg font-medium transition-all flex items-center gap-2 transform hover:scale-105 active:scale-[0.95] duration-200 ${
                          pushSubscribed
                            ? 'bg-red-500/20 hover:bg-red-500/30 border border-red-500/30 text-red-300'
                            : 'bg-green-500/20 hover:bg-green-500/30 border border-green-500/30 text-green-300'
                        } disabled:opacity-50`}
                      >
                        {pushLoading ? (
                          <>Lädt...</>
                        ) : pushSubscribed ? (
                          <>
                            <BellOff className="w-4 h-4" />
                            Aktivieren
                          </>
                        ) : (
                          <>
                            <Bell className="w-4 h-4" />
                            Deaktivieren
                          </>
                        )}
                      </button>
                    </div>

                    {pushSubscribed && (
                      <div className="p-4 rounded-lg bg-green-500/10 border border-green-500/20 animate-in fade-in zoom-in-95 duration-500 delay-200">
                        <p className="text-green-300 text-sm flex items-center gap-2">
                          <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></span>
                          Push-Benachrichtigungen sind aktiviert
                        </p>
                      </div>
                    )}

                    {!pushSubscribed && (
                      <div className="p-4 rounded-lg bg-gray-500/10 border border-gray-500/20 animate-in fade-in zoom-in-95 duration-500 delay-200">
                        <p className="text-gray-300 text-sm flex items-center gap-2">
                          <span className="w-2 h-2 bg-gray-400 rounded-full"></span>
                          Push-Benachrichtigungen sind deaktiviert
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Admin & Account Section */}
          <div className="mt-8 space-y-4 border-t border-white/10 pt-8 animate-in fade-in slide-in-from-bottom-4 duration-500 delay-300">
            {isAdmin && (
              <button
                onClick={() => router.push('/admin')}
                className="w-full flex items-center justify-between p-4 rounded-lg bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/20 transition-all group transform hover:scale-[1.02] active:scale-[0.98] duration-200 animate-in fade-in slide-in-from-bottom-4 duration-500"
              >
                <div className="flex items-center gap-3 text-left">
                  <Shield className="w-5 h-5 text-blue-400 group-hover:scale-110 transition-transform" />
                  <div>
                    <p className="font-medium text-white">Admin-Bereich</p>
                    <p className="text-sm text-gray-400">Verwalte Wartungsmeldungen</p>
                  </div>
                </div>
                <span className="text-gray-400 group-hover:text-white transition-colors">→</span>
              </button>
            )}

            <button
              onClick={handleSignOut}
              className="w-full flex items-center justify-between p-4 rounded-lg bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 transition-all group transform hover:scale-[1.02] active:scale-[0.98] duration-200 animate-in fade-in slide-in-from-bottom-4 duration-500 delay-100"
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
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-300">
          <Toast
            message={toast.message}
            type={toast.type}
            onClose={() => setToast(null)}
          />
        </div>
      )}
    </div>
  );
}
