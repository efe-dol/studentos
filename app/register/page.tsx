'use client';
import { useState } from 'react';
import { createClient } from '@/utils/supabase/client';
import { useRouter } from 'next/navigation';
import AuthBackground from '@/app/components/AuthBackground';
export default function Register() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [className, setClassName] = useState('');
  const [birthdate, setBirthdate] = useState('');
  const supabase = createClient();
  const router = useRouter();

  const handleSignUp = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!email || !password || !firstName || !lastName || !className || !birthdate) {
      alert('Bitte alle Felder ausfüllen!');
      return;
    }

    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
    });

    if (authError) {
      alert(`Auth-Fehler: ${authError.message}`);
      return;
    }

    if (!authData.user?.id) {
      alert('Fehler: Keine User-ID erhalten');
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
      alert(`Fehler beim Speichern der Daten: ${updateError.message}`);
      return;
    }

    alert('Registrierung erfolgreich! Überprüfe deine Email zur Verifizierung.');
    router.push('/login');
  };

  return (
    <div className="min-h-screen relative overflow-hidden flex items-center justify-center">
      <AuthBackground />
      <form
        onSubmit={handleSignUp}
        className="relative z-10 w-full max-w-xl p-10 rounded-2xl backdrop-blur-xl bg-white/5 border border-white/10 shadow-2xl animate-[slideUpSmooth_0.6s_cubic-bezier(0.16,1,0.3,1)]"
      >
        <div className="mb-6 text-center">
          <h1 className="text-white text-3xl font-semibold">Account erstellen</h1>
          <p className="text-gray-300 text-sm mt-1">Erstelle einen Account, um mit StudentOS zu starten</p>
        </div>

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
              className="focus-glow px-4 py-3 rounded-xl text-white placeholder-transparent"
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

        <div className="mt-4 text-center">
          <p className="text-gray-400 text-sm">
            Du hast bereits einen Account?{' '}
            <a href="/login" className="text-white/70 hover:text-white transition-colors">
              Hier anmelden
            </a>
          </p>
        </div>
      </form>

      <div className="absolute bottom-6 left-0 right-0 text-center">
        <p className="text-gray-500 text-xs">© 2026 StudentOS by Efe Dolaman</p>
      </div>
    </div>
  );
}
