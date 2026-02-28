'use client';
import { useEffect, useState } from 'react';
import { createClient } from '@/utils/supabase/client';
import { useRouter } from 'next/navigation';
import AuthBackground from '@/app/components/AuthBackground';

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
};

export default function Dashboard() {
  const FIXED_SCHOOL_NAME = 'Gymnasium Weilheim i.OB';
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [showEditModal, setShowEditModal] = useState(false);
  const [editFirstName, setEditFirstName] = useState('');
  const [editLastName, setEditLastName] = useState('');
  const [editClassName, setEditClassName] = useState('');
  const [editBirthdate, setEditBirthdate] = useState('');
  const [editSchool, setEditSchool] = useState('');
  const [savingProfile, setSavingProfile] = useState(false);
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
    sessionUser: { email?: string; user_metadata?: any },
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
      extractFirstName(metadata.first_name) ||
      metadata.name?.split(' ')[0] ||
      metadata.full_name?.split(' ')[0] ||
      extractFirstName(emailFirstName) ||
      extractFirstName(emailLocalPart.replace(/[._-]+/g, ' ')) ||
      'Nutzer';

    return toDisplayName(metadataFirstName) || 'Nutzer';
  };

  const handleSaveProfile = async () => {
    if (!user) {
      alert('Benutzer nicht gefunden');
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
      alert('Fehler beim Speichern: ' + error.message);
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
      setShowEditModal(false);
      alert('Profil aktualisiert!');
    }

    setSavingProfile(false);
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
          .select('first_name, last_name, class_name, birthdate, school')
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
          setEditFirstName(normalizedProfile.first_name || '');
          setEditLastName(profileData.last_name || '');
          setEditClassName(profileData.class_name || '');
          setEditBirthdate(profileData.birthdate || '');
          setEditSchool(FIXED_SCHOOL_NAME);
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
              setEditFirstName(fallbackFirstName);
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

  const handleSignOut = async () => {
    await supabase.auth.signOut();
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

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-[#0a0a0a] via-[#121212] to-[#1a1a1a] flex items-center justify-center">
        <div className="text-white">Lädt...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#0a0a0a] via-[#121212] to-[#1a1a1a] text-white overflow-x-hidden">
      <AuthBackground />

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
              onClick={() => setShowEditModal(true)}
              className="p-2 rounded-lg hover:bg-white/10 transition-all border border-white/10"
            >
              ⚙️
            </button>
            <button
              onClick={handleSignOut}
              className="px-4 py-2 rounded-lg bg-white/10 hover:bg-white/20 border border-white/20 transition-all text-sm font-medium"
            >
              Sign Out
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="relative z-10 max-w-7xl mx-auto px-6 py-8">
        {activeTab === 'dashboard' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* TODO's */}
            <div className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-2xl p-6">
              <h2 className="text-xl font-semibold mb-4">📝 ToDos</h2>
              <div className="space-y-3">
                {[
                  { title: 'Englisch Hausaufgaben', done: false },
                  { title: 'Mathe Kapitel 5 lesen', done: true },
                  { title: 'Biologie Protokoll schreiben', done: false },
                ].map((todo, i) => (
                  <div key={i} className="flex gap-3 p-2 rounded-lg hover:bg-white/5 transition-all">
                    <input type="checkbox" defaultChecked={todo.done} className="mt-1" />
                    <span className={todo.done ? 'line-through text-gray-500' : ''}>{todo.title}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Hausaufgaben */}
            <div className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-2xl p-6">
              <h2 className="text-xl font-semibold mb-4">📚 Hausaufgaben</h2>
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
            <div className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-2xl p-6">
              <h2 className="text-xl font-semibold mb-4">📊 Leistungen</h2>
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
            <div className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-2xl p-6 lg:col-span-2">
              <h2 className="text-xl font-semibold mb-4">📅 Nächste Termine</h2>
              <div className="space-y-2">
                {[
                  { date: '28.02.2026', event: 'Bio Test' },
                  { date: '01.03.2026', event: 'Sportunterricht ausfällt' },
                  { date: '03.03.2026', event: 'Klassensprecher-Treffen' },
                  { date: '05.03.2026', event: 'Elternsprechtag' },
                ].map((term, i) => (
                  <div key={i} className="flex gap-3 p-2 rounded-lg hover:bg-white/5 transition-all">
                    <span className="text-sm font-medium whitespace-nowrap text-blue-400">{term.date}</span>
                    <span className="text-sm text-gray-300">{term.event}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Quick Actions */}
            <div className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-2xl p-6">
              <h2 className="text-xl font-semibold mb-4">⚡ Quick Links</h2>
              <div className="space-y-2">
                <button className="w-full py-2 px-3 rounded-lg bg-white/10 hover:bg-white/20 border border-white/20 transition-all text-sm">
                  Krankmeldung
                </button>
                <button className="w-full py-2 px-3 rounded-lg bg-white/10 hover:bg-white/20 border border-white/20 transition-all text-sm">
                  Entschuldigungen
                </button>
                <button className="w-full py-2 px-3 rounded-lg bg-white/10 hover:bg-white/20 border border-white/20 transition-all text-sm">
                  Vertretungen
                </button>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'schedule' && (
          <div className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-2xl p-8 text-center">
            <p className="text-gray-400">Stundenplan - Seite noch in Bearbeitung</p>
          </div>
        )}

        {activeTab === 'subjects' && (
          <div className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-2xl p-8 text-center">
            <p className="text-gray-400">Fächer - Seite noch in Bearbeitung</p>
          </div>
        )}

        {activeTab === 'homework' && (
          <div className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-2xl p-8 text-center">
            <p className="text-gray-400">Hausaufgaben - Seite noch in Bearbeitung</p>
          </div>
        )}

        {activeTab === 'substitutions' && (
          <div className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-2xl p-8 text-center">
            <p className="text-gray-400">Vertretungen - Seite noch in Bearbeitung</p>
          </div>
        )}
      </div>

      {/* Bottom Navigation */}
      <div className="fixed bottom-0 left-0 right-0 z-20 border-t border-white/10 backdrop-blur-xl bg-white/5">
        <div className="max-w-7xl mx-auto px-6 py-4 flex justify-around items-center">
          {[
            { id: 'dashboard', label: 'Dashboard', icon: '📊' },
            { id: 'schedule', label: 'Stundenplan', icon: '📖' },
            { id: 'subjects', label: 'Fächer', icon: '📚' },
            { id: 'homework', label: 'Hausaufgaben', icon: '✏️' },
            { id: 'substitutions', label: 'Vertretungen', icon: '🔄' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex flex-col items-center gap-1 px-4 py-2 rounded-lg transition-all ${
                activeTab === tab.id
                  ? 'bg-white/20 border border-white/30 text-white'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              <span className="text-xl">{tab.icon}</span>
              <span className="text-xs font-medium hidden sm:inline">{tab.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Bottom Padding for Navigation */}
      <div className="h-24" />

      {/* Edit Profile Modal */}
      {showEditModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-gradient-to-b from-[#1a1a1a] to-[#0f0f0f] border border-white/10 rounded-2xl p-8 max-w-md w-full max-h-[90vh] overflow-y-auto">
            <h2 className="text-white text-2xl font-semibold mb-6">Profil bearbeiten</h2>

            <div className="space-y-4 mb-6">
              <div className="field">
                <input
                  className="focus-glow px-4 py-3 rounded-xl text-white placeholder-transparent w-full"
                  type="text"
                  placeholder=" "
                  value={editFirstName}
                  onChange={e => setEditFirstName(e.target.value)}
                />
                <label>Vorname</label>
              </div>

              <div className="field">
                <input
                  className="focus-glow px-4 py-3 rounded-xl text-white placeholder-transparent w-full"
                  type="text"
                  placeholder=" "
                  value={editLastName}
                  onChange={e => setEditLastName(e.target.value)}
                />
                <label>Nachname</label>
              </div>

              <div className="field">
                <input
                  className="focus-glow px-4 py-3 rounded-xl text-white placeholder-transparent w-full"
                  type="text"
                  placeholder=" "
                  value={editClassName}
                  onChange={e => setEditClassName(e.target.value)}
                />
                <label>Klasse (z.B. 10a)</label>
              </div>

              <div className="field">
                <input
                  className="focus-glow px-4 py-3 rounded-xl text-white placeholder-transparent w-full"
                  type="date"
                  placeholder=" "
                  value={editBirthdate}
                  onChange={e => setEditBirthdate(e.target.value)}
                />
                <label>Geburtsdatum</label>
              </div>

              <div className="field">
                <input
                  className="focus-glow px-4 py-3 rounded-xl text-white placeholder-transparent w-full"
                  type="text"
                  value={FIXED_SCHOOL_NAME}
                  disabled
                  readOnly
                />
                <label>Schule</label>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowEditModal(false)}
                className="flex-1 py-2 rounded-lg bg-white/10 hover:bg-white/20 border border-white/20 text-white font-medium transition-all"
              >
                Abbrechen
              </button>
              <button
                onClick={handleSaveProfile}
                disabled={savingProfile}
                className="flex-1 py-2 rounded-lg bg-blue-500 hover:bg-blue-600 text-white font-medium transition-all disabled:opacity-50"
              >
                {savingProfile ? 'Speichern...' : 'Speichern'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
