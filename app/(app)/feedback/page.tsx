'use client';

import AuthBackground from '@/app/components/common/AuthBackground';
import { ArrowLeft, AlertTriangle, Send, CheckCircle2 } from 'lucide-react';
import Link from 'next/link';
import { FormEvent, useState } from 'react';

const FORMSPREE_ENDPOINT = 'https://formspree.io/f/xykdqepy';

export default function FeedbackPage() {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitError(null);
    setSubmitSuccess(false);

    if (!firstName.trim() || !lastName.trim() || !message.trim()) {
      setSubmitError('Bitte fülle alle Pflichtfelder aus.');
      return;
    }

    setIsSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('firstName', firstName.trim());
      formData.append('lastName', lastName.trim());
      formData.append('email', email.trim());
      formData.append('message', message.trim());
      formData.append('source', 'StudentOS Feedback / Bug-Reports');
      formData.append('page', '/feedback');
      formData.append('_subject', `StudentOS Bug/Feedback von ${firstName.trim()} ${lastName.trim()}`);

      const response = await fetch(FORMSPREE_ENDPOINT, {
        method: 'POST',
        headers: {
          Accept: 'application/json',
        },
        body: formData,
      });

      if (!response.ok) {
        const errorData = (await response.json().catch(() => null)) as
          | { errors?: Array<{ message?: string }> }
          | null;
        const formspreeMessage = errorData?.errors?.[0]?.message;
        throw new Error(formspreeMessage || 'Senden fehlgeschlagen. Bitte versuche es erneut.');
      }

      setSubmitSuccess(true);
      setFirstName('');
      setLastName('');
      setEmail('');
      setMessage('');
    } catch (error) {
      if (error instanceof TypeError) {
        setSubmitError('Verbindung zu Formspree fehlgeschlagen. Bitte prüfe Netzwerk, Adblocker oder Seite neu laden.');
      } else {
        const message = error instanceof Error ? error.message : 'Unbekannter Fehler beim Senden.';
        setSubmitError(message);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-gradient-to-b from-[#0a0a0a] via-[#121212] to-[#1a1a1a] text-white flex flex-col overflow-hidden">
      <AuthBackground />

      <div className="relative z-10 flex-1 max-w-3xl w-full mx-auto px-6 pt-6 pb-24 flex flex-col overflow-hidden">
        <div className="sticky top-0 z-30 backdrop-blur-xl bg-[#0d0d0d]/70 rounded-b-2xl pb-5">
          <div className="flex items-center gap-4 mb-5 card-stagger-1 pt-2">
            <Link
              href="/dashboard"
              className="p-2 rounded-lg hover:bg-white/10 transition-all border border-white/10 hover:scale-105"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <h1 className="text-3xl sm:text-4xl font-bold">Feedback / Bug-Reports</h1>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto overflow-x-hidden pt-6 pb-8">
          <div className="space-y-6 card-stagger-3">
            <section className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-2xl p-6 sm:p-8 content-fade-in">
              <h2 className="text-xl sm:text-2xl font-semibold mb-4 flex items-center gap-2">
                <AlertTriangle className="w-5 h-5" />
                Melde Probleme oder gib Feedback
              </h2>
              <p className="text-gray-300 text-sm sm:text-base leading-relaxed mb-6">
                Deine Nachricht wird direkt über Formspree übermittelt.
              </p>

              {submitSuccess ? (
                <div className="p-4 rounded-lg bg-green-500/10 border border-green-500/30 text-green-200 flex items-center gap-3">
                  <CheckCircle2 className="w-5 h-5" />
                  <p>Danke! Dein Feedback wurde erfolgreich gesendet.</p>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="field">
                    <input
                      id="firstName"
                      type="text"
                      name="firstName"
                      placeholder=" "
                      required
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      className="focus-glow px-4 py-3 rounded-xl text-white placeholder-transparent w-full bg-white/5 border border-white/10"
                    />
                    <label>Vorname</label>
                  </div>

                  <div className="field">
                    <input
                      id="lastName"
                      type="text"
                      name="lastName"
                      placeholder=" "
                      required
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      className="focus-glow px-4 py-3 rounded-xl text-white placeholder-transparent w-full bg-white/5 border border-white/10"
                    />
                    <label>Nachname</label>
                  </div>

                  <div className="field">
                    <input
                      id="email"
                      type="email"
                      name="email"
                      placeholder=" "
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="focus-glow px-4 py-3 rounded-xl text-white placeholder-transparent w-full bg-white/5 border border-white/10"
                    />
                    <label>E-Mail (optional)</label>
                  </div>

                  <div>
                    <label htmlFor="message" className="block text-sm text-gray-300 mb-2">Nachricht</label>
                    <textarea
                      id="message"
                      name="message"
                      required
                      rows={6}
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      className="focus-glow px-4 py-3 rounded-xl text-white w-full bg-white/5 border border-white/10 resize-y"
                    />
                  </div>

                  {submitError && (
                    <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-200 text-sm">
                      {submitError}
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full py-3 rounded-lg bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white font-medium transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    <Send className="w-4 h-4" />
                    {isSubmitting ? 'Wird gesendet...' : 'Absenden'}
                  </button>
                </form>
              )}
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}
