'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import AuthBackground from '@/app/components/common/AuthBackground';
import LoadingScreen from '@/app/components/common/LoadingScreen';
import Toast from '@/app/components/common/Toast';
import { Shield, AlertTriangle, Plus, Trash2, Edit as EditIcon, X, ArrowLeft } from 'lucide-react';

type MaintenanceMessage = {
  id: string;
  message: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export default function AdminPage() {
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [messages, setMessages] = useState<MaintenanceMessage[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingMessage, setEditingMessage] = useState<MaintenanceMessage | null>(null);
  const [messageText, setMessageText] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  
  const supabase = createClient();
  const router = useRouter();

  const checkAdmin = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push('/login');
        return;
      }

      const response = await fetch('/api/admin/check');
      const data = await response.json();
      
      if (!data.isAdmin) {
        setToast({ message: 'Zugriff verweigert - Nur für Administratoren', type: 'error' });
        setTimeout(() => router.push('/dashboard'), 2000);
        return;
      }

      setIsAdmin(true);
      await fetchMessages();
      setLoading(false);
    } catch (error) {
      console.error('Error checking admin:', error);
      router.push('/dashboard');
    }
  };

  const fetchMessages = async () => {
    try {
      const { data: allMessages } = await supabase
        .from('maintenance_messages')
        .select('*')
        .order('created_at', { ascending: false });

      setMessages(allMessages || []);
    } catch (error) {
      console.error('Error fetching messages:', error);
    }
  };

  useEffect(() => {
    checkAdmin();
  }, []);

  const resetForm = () => {
    setMessageText('');
    setIsActive(true);
  };

  const handleAddMessage = async () => {
    if (!messageText.trim()) {
      setToast({ message: 'Bitte geben Sie eine Nachricht ein', type: 'error' });
      return;
    }

    setSaving(true);
    try {
      const response = await fetch('/api/maintenance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: messageText.trim(),
          is_active: isActive,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to create message');
      }

      await fetchMessages();
      setShowAddModal(false);
      resetForm();
      setToast({ message: 'Wartungsmeldung erstellt!', type: 'success' });
    } catch (error) {
      console.error('Error creating message:', error);
      setToast({ message: 'Fehler beim Erstellen', type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const handleEditMessage = async () => {
    if (!editingMessage) return;
    if (!messageText.trim()) {
      setToast({ message: 'Bitte geben Sie eine Nachricht ein', type: 'error' });
      return;
    }

    setSaving(true);
    try {
      const response = await fetch(`/api/maintenance/${editingMessage.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: messageText.trim(),
          is_active: isActive,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to update message');
      }

      await fetchMessages();
      setShowEditModal(false);
      setEditingMessage(null);
      resetForm();
      setToast({ message: 'Wartungsmeldung aktualisiert!', type: 'success' });
    } catch (error) {
      console.error('Error updating message:', error);
      setToast({ message: 'Fehler beim Aktualisieren', type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteMessage = async (id: string) => {
    if (!confirm('Möchten Sie diese Wartungsmeldung wirklich löschen?')) {
      return;
    }

    try {
      const response = await fetch(`/api/maintenance/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete message');
      }

      await fetchMessages();
      setToast({ message: 'Wartungsmeldung gelöscht', type: 'success' });
    } catch (error) {
      console.error('Error deleting message:', error);
      setToast({ message: 'Fehler beim Löschen', type: 'error' });
    }
  };

  const openEditModal = (message: MaintenanceMessage) => {
    setEditingMessage(message);
    setMessageText(message.message);
    setIsActive(message.is_active);
    setShowEditModal(true);
  };

  if (loading) {
    return <LoadingScreen />;
  }

  if (!isAdmin) {
    return null;
  }

  const activeMessages = messages.filter(m => m.is_active);
  const inactiveMessages = messages.filter(m => !m.is_active);

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#0a0a0a] via-[#121212] to-[#1a1a1a] text-white">
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
                <Shield className="w-10 h-10 text-blue-400 icon-pulse" />
                Admin-Bereich
              </h1>
              <p className="text-gray-400 mt-2">
                Wartungsmeldungen verwalten
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
            Neue Meldung
          </button>
        </div>

        {/* Active Messages */}
        <div className="mb-8 card-stagger-2">
          <h2 className="text-2xl font-semibold mb-4 flex items-center gap-2">
            <AlertTriangle className="w-6 h-6 text-red-400" />
            Aktive Wartungsmeldungen
          </h2>
          {activeMessages.length === 0 ? (
            <div className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-2xl p-8 text-center content-fade-in">
              <p className="text-gray-400">Keine aktiven Wartungsmeldungen</p>
            </div>
          ) : (
            <div className="space-y-3">
              {activeMessages.map((message, index) => (
                <div
                  key={message.id}
                  className="backdrop-blur-xl bg-red-500/10 border border-red-500/30 rounded-xl p-4 hover:bg-red-500/20 transition-all content-fade-in hover:scale-[1.02]"
                  style={{ animationDelay: `${index * 0.05}s` }}
                >
                  <div className="flex items-start gap-4">
                    <AlertTriangle className="w-5 h-5 text-red-400 mt-1 flex-shrink-0" />
                    <div className="flex-1">
                      <p className="text-white">{message.message}</p>
                      <p className="text-xs text-gray-400 mt-2">
                        Erstellt: {new Date(message.created_at).toLocaleString('de-DE')}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => openEditModal(message)}
                        className="p-2 rounded-lg hover:bg-white/10 transition-all border border-white/10 hover:scale-110"
                      >
                        <EditIcon className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteMessage(message.id)}
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

        {/* Inactive Messages */}
        {inactiveMessages.length > 0 && (
          <div className="card-stagger-3">
            <h2 className="text-2xl font-semibold mb-4">Inaktive Meldungen</h2>
            <div className="space-y-3">
              {inactiveMessages.map((message, index) => (
                <div
                  key={message.id}
                  className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-xl p-4 opacity-60 content-fade-in hover:opacity-80 transition-all"
                  style={{ animationDelay: `${index * 0.05}s` }}
                >
                  <div className="flex items-start gap-4">
                    <div className="flex-1">
                      <p className="text-gray-300">{message.message}</p>
                      <p className="text-xs text-gray-500 mt-2">
                        Erstellt: {new Date(message.created_at).toLocaleString('de-DE')}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => openEditModal(message)}
                        className="p-2 rounded-lg hover:bg-white/10 transition-all border border-white/10 hover:scale-110"
                      >
                        <EditIcon className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteMessage(message.id)}
                        className="p-2 rounded-lg hover:bg-red-500/20 transition-all border border-white/10 hover:scale-110"
                      >
                        <Trash2 className="w-4 h-4 text-red-400" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Add Message Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 modal-backdrop-animate">
          <div className="bg-gradient-to-b from-[#1a1a1a] to-[#0f0f0f] border border-white/10 rounded-2xl p-8 max-w-md w-full mx-4 modal-animate">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-semibold">Neue Wartungsmeldung</h2>
              <button
                onClick={() => setShowAddModal(false)}
                className="p-2 rounded-lg hover:bg-white/10 transition-all hover:scale-110"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="field modal-field-1">
                <textarea
                  className="focus-glow px-4 py-3 rounded-xl text-white placeholder-transparent w-full min-h-[120px]"
                  placeholder=" "
                  value={messageText}
                  onChange={e => setMessageText(e.target.value)}
                />
                <label>Nachricht *</label>
              </div>

              <div className="flex items-center gap-3 modal-field-2">
                <input
                  type="checkbox"
                  id="isActive"
                  checked={isActive}
                  onChange={e => setIsActive(e.target.checked)}
                  className="w-5 h-5 cursor-pointer"
                />
                <label htmlFor="isActive" className="text-white cursor-pointer">
                  Sofort aktiv schalten
                </label>
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
                onClick={handleAddMessage}
                disabled={saving}
                className="flex-1 py-2 rounded-lg bg-blue-500 hover:bg-blue-600 transition-all disabled:opacity-50 hover:scale-105 hover:shadow-lg hover:shadow-blue-500/50"
              >
                {saving ? 'Speichern...' : 'Erstellen'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Message Modal */}
      {showEditModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 modal-backdrop-animate">
          <div className="bg-gradient-to-b from-[#1a1a1a] to-[#0f0f0f] border border-white/10 rounded-2xl p-8 max-w-md w-full mx-4 modal-animate">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-semibold">Meldung bearbeiten</h2>
              <button
                onClick={() => {
                  setShowEditModal(false);
                  setEditingMessage(null);
                  resetForm();
                }}
                className="p-2 rounded-lg hover:bg-white/10 transition-all hover:scale-110"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="field modal-field-1">
                <textarea
                  className="focus-glow px-4 py-3 rounded-xl text-white placeholder-transparent w-full min-h-[120px]"
                  placeholder=" "
                  value={messageText}
                  onChange={e => setMessageText(e.target.value)}
                />
                <label>Nachricht *</label>
              </div>

              <div className="flex items-center gap-3 modal-field-2">
                <input
                  type="checkbox"
                  id="isActiveEdit"
                  checked={isActive}
                  onChange={e => setIsActive(e.target.checked)}
                  className="w-5 h-5 cursor-pointer"
                />
                <label htmlFor="isActiveEdit" className="text-white cursor-pointer">
                  Aktiv
                </label>
              </div>
            </div>

            <div className="flex gap-3 mt-6 modal-buttons-animate">
              <button
                onClick={() => {
                  setShowEditModal(false);
                  setEditingMessage(null);
                  resetForm();
                }}
                className="flex-1 py-2 rounded-lg bg-white/10 hover:bg-white/20 border border-white/20 transition-all hover:scale-105"
              >
                Abbrechen
              </button>
              <button
                onClick={handleEditMessage}
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
