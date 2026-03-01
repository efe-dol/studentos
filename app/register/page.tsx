'use client';
import { useState } from 'react';
import { createClient } from '@/utils/supabase/client';
import { useRouter } from 'next/navigation';
import AuthBackground from '@/app/components/AuthBackground';
import Toast from '@/app/components/Toast';

export default function Register() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [className, setClassName] = useState('');
  const [birthdate, setBirthdate] = useState('');
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const supabase = createClient();
  const router = useRouter();

  const handleSignUp = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!email || !password || !firstName || !lastName || !className || !birthdate) {
      setToast({ message: 'Bitte alle Felder ausfüllen!', type: 'error' });
      return;
    }

    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
    });

    if (authError) {
      setToast({ message: `Auth-Fehler: ${authError.message}`, type: 'error' });
      return;
    }

    if (!authData.user?.id) {
      setToast({ message: 'Fehler: Keine User-ID erhalten', type: 'error' });
      return;
    }

    const userId = authData.user.id;

    // Warte bis der Trigger das Profile erstellt hat
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Update das Profil mit den Benutzerdaten
    const { error: updateError } = await supabase
      .from('profiles')
      .update({
        first_name: firstName,
        last_name: lastName,
        class_name: className,
        birthdate: birthdate,
        school: 'Gymnasium Weilheim i.OB',
      })
      .eq('id', userId);

    if (updateError) {
      setToast({ message: `Fehler beim Speichern der Daten: ${updateError.message}`, type: 'error' });
      return;
    }

    setToast({ message: 'Registrierung erfolgreich! Überprüfe deine Email zur Verifizierung.', type: 'success' });
    setTimeout(() => router.push('/login'), 2000);
  };

  return (
    <div className="min-h-screen relative overflow-hidden flex flex-col">
      <AuthBackground />
      
      {/* Header */}
      <div className="relative z-10 border-b border-white/10 backdrop-blur-xl bg-white/5">
        <div className="w-full px-6 py-4">
          <h2 className="text-white text-xl font-semibold">StudentOS</h2>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-10">
        {/* Title Section - Outside the form */}
        <div className="w-full max-w-xl mb-8 text-center animate-[slideUpSmooth_0.5s_cubic-bezier(0.16,1,0.3,1)]">
          <h1 className="text-3xl font-bold text-white mb-3">
            Account erstellen
          </h1>
          <p className="text-gray-400 text-base">
            Erstelle einen Account, um mit StudentOS zu starten
          </p>
        </div>

        {/* Form Box */}
        <form
          onSubmit={handleSignUp}
          className="relative z-10 w-full max-w-xl p-10 rounded-2xl backdrop-blur-xl bg-white/5 border border-white/10 shadow-2xl animate-[slideUpSmooth_0.6s_cubic-bezier(0.16,1,0.3,1)_0.1s] opacity-0 [animation-fill-mode:forwards]"
        >

        <div className="grid grid-cols-1 gap-4">
          <div className="field">
            <input
              className="focus-glow px-4 py-3 rounded-xl text-white placeholder-transparent"
              type="email"
              placeholder=" "
              onChange={e => setEmail(e.target.value)}
              required
            />
            <label>E‑Mail</label>
          </div>

          <div className="field">
            <input
              className="focus-glow px-4 py-3 rounded-xl text-white placeholder-transparent"
              type="password"
              placeholder=" "
              onChange={e => setPassword(e.target.value)}
              required
            />
            <label>Passwort</label>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="field">
              <input
                className="focus-glow px-4 py-3 rounded-xl text-white placeholder-transparent"
                type="text"
                placeholder=" "
                onChange={e => setFirstName(e.target.value)}
                required
              />
              <label>Vorname</label>
            </div>

            <div className="field">
              <input
                className="focus-glow px-4 py-3 rounded-xl text-white placeholder-transparent"
                type="text"
                placeholder=" "
                onChange={e => setLastName(e.target.value)}
                required
              />
              <label>Nachname</label>
            </div>
          </div>

          <div className="field">
            <input
              className="focus-glow px-4 py-3 rounded-xl text-white placeholder-transparent"
              type="text"
              placeholder=" "
              onChange={e => setClassName(e.target.value)}
              required
            />
            <label>Klasse (z.B. 9c)</label>
          </div>

          <div className="field">
            <input
              className="focus-glow px-4 py-3 rounded-xl text-white placeholder-transparent w-full"
              type="date"
              placeholder=" "
              onChange={e => setBirthdate(e.target.value)}
              required
            />
            <label>Geburtsdatum</label>
          </div>
        </div>

        <div className="mt-6">
          <button
            type="submit"
            className="w-full py-3 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 text-white font-semibold shadow-lg hover:scale-[1.01] active:scale-95 transition-all duration-200 backdrop-blur-sm"
          >
            Registrieren
          </button>
        </div>

        {/* Divider with OR */}
        <div className="relative my-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-white/10"></div>
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="px-4 bg-[#0f0f0f] text-gray-500">ODER</span>
          </div>
        </div>

        {/* Login Button */}
        <div className="mt-4">
          <a
            href="/login"
            className="w-full py-3 rounded-xl border border-white/20 text-gray-300 hover:text-white hover:bg-white/5 font-medium transition-all duration-200 flex items-center justify-center"
          >
            Bereits registriert? Anmelden
          </a>
        </div>
      </form>
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
