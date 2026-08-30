'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import AuthBackground from '@/app/components/common/AuthBackground';
import LoadingScreen from '@/app/components/common/LoadingScreen';
import { useDelayedFlag } from '@/lib/hooks/useDelayedFlag';
import { Shield, AlertTriangle, Plus, Trash2, Edit as EditIcon, X, ArrowLeft, Users, Lock, Unlock, ToggleLeft, ToggleRight } from 'lucide-react';

type MaintenanceMessage = {
  id: string;
  message: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

type AdminUser = {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  class_name: string;
  role: 'user' | 'admin';
  is_blocked: boolean;
};

type AlertPopup = {
  title: string;
  message: string;
  type: 'success' | 'error' | 'info';
};

type ConfirmPopup = {
  title: string;
  message: string;
  confirmLabel: string;
  cancelLabel?: string;
  variant?: 'danger' | 'primary';
  onConfirm: () => Promise<void>;
};

export default function AdminPage() {
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [messages, setMessages] = useState<MaintenanceMessage[]>([]);
  const [maintenanceMode, setMaintenanceMode] = useState(false);
  const [maintenanceLoading, setMaintenanceLoading] = useState(false);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [updatingUserId, setUpdatingUserId] = useState<string | null>(null);
  const [deletingUserId, setDeletingUserId] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingMessage, setEditingMessage] = useState<MaintenanceMessage | null>(null);
  const [messageText, setMessageText] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [saving, setSaving] = useState(false);
  const [alertPopup, setAlertPopup] = useState<AlertPopup | null>(null);
  const [confirmPopup, setConfirmPopup] = useState<ConfirmPopup | null>(null);
  const [confirmLoading, setConfirmLoading] = useState(false);
  
  const supabase = createClient();
  const router = useRouter();
  const showLoader = useDelayedFlag(loading);

  const showAlert = (message: string, type: AlertPopup['type']) => {
    const titleByType: Record<AlertPopup['type'], string> = {
      success: 'Erfolg',
      error: 'Fehler',
      info: 'Hinweis',
    };

    setAlertPopup({
      title: titleByType[type],
      message,
      type,
    });
  };

  const checkAdmin = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push('/login');
        return;
      }

      setCurrentUserId(session.user.id);

      const response = await fetch('/api/admin/check');
      const data = await response.json();
      
      if (!data.isAdmin) {
        showAlert('Zugriff verweigert - Nur für Administratoren', 'error');
        setTimeout(() => router.push('/dashboard'), 2000);
        return;
      }

      setIsAdmin(true);
      await Promise.all([fetchMessages(), fetchMaintenanceMode(), fetchUsers()]);
      setLoading(false);
    } catch (error) {
      console.error('Error checking admin:', error);
      router.push('/dashboard');
    }
  };

  const fetchMaintenanceMode = async () => {
    try {
      const response = await fetch('/api/maintenance-mode');
      if (!response.ok) return;
      const data = await response.json();
      setMaintenanceMode(Boolean(data.maintenanceMode));
    } catch (error) {
      console.error('Error fetching maintenance mode:', error);
    }
  };

  const executeToggleMaintenanceMode = async () => {
    setMaintenanceLoading(true);
    try {
      const response = await fetch('/api/maintenance-mode', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ maintenanceMode: !maintenanceMode }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Fehler beim Umschalten des Wartungsmodus');
      }

      const data = await response.json();
      setMaintenanceMode(Boolean(data.maintenanceMode));
      showAlert(
        data.maintenanceMode
          ? 'Wartungsmodus aktiviert (nur Admin-Login)'
          : 'Wartungsmodus deaktiviert',
        'success'
      );
    } catch (error: unknown) {
      showAlert(error instanceof Error ? error.message : 'Fehler beim Umschalten des Wartungsmodus', 'error');
    } finally {
      setMaintenanceLoading(false);
    }
  };

  const toggleMaintenanceMode = () => {
    setConfirmPopup({
      title: maintenanceMode ? 'Wartungsmodus deaktivieren?' : 'Wartungsmodus aktivieren?',
      message: maintenanceMode
        ? 'Möchten Sie den Wartungsmodus wirklich deaktivieren?'
        : 'Möchten Sie den Wartungsmodus wirklich aktivieren? Dann können sich nur Admins einloggen und die Registrierung ist gesperrt.',
      confirmLabel: maintenanceMode ? 'Deaktivieren' : 'Aktivieren',
      cancelLabel: 'Abbrechen',
      variant: maintenanceMode ? 'primary' : 'danger',
      onConfirm: executeToggleMaintenanceMode,
    });
  };

  const fetchUsers = async () => {
    setUsersLoading(true);
    try {
      const response = await fetch('/api/admin/users');
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Fehler beim Laden der Nutzer');
      }

      const data = await response.json();
      setUsers(Array.isArray(data.users) ? data.users : []);
    } catch (error) {
      console.error('Error fetching users:', error);
      showAlert('Fehler beim Laden der Nutzerliste', 'error');
    } finally {
      setUsersLoading(false);
    }
  };

  const handleUpdateUser = async (
    userId: string,
    payload: Partial<Pick<AdminUser, 'role' | 'is_blocked'>>
  ) => {
    setUpdatingUserId(userId);
    try {
      const response = await fetch(`/api/admin/users/${userId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Fehler beim Aktualisieren des Nutzers');
      }

      await fetchUsers();
      showAlert('Nutzer aktualisiert', 'success');
    } catch (error: unknown) {
      showAlert(error instanceof Error ? error.message : 'Fehler beim Aktualisieren des Nutzers', 'error');
    } finally {
      setUpdatingUserId(null);
    }
  };

  const handleDeleteUser = async (userId: string, email: string) => {
    setConfirmPopup({
      title: 'Nutzer löschen?',
      message: `Nutzer ${email} wirklich löschen? Diese Aktion kann nicht rückgängig gemacht werden.`,
      confirmLabel: 'Löschen',
      cancelLabel: 'Abbrechen',
      variant: 'danger',
      onConfirm: async () => {
        setDeletingUserId(userId);
        try {
          const response = await fetch(`/api/admin/users/${userId}`, {
            method: 'DELETE',
          });

          if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Fehler beim Löschen des Nutzers');
          }

          await fetchUsers();
          showAlert('Nutzer gelöscht', 'success');
        } catch (error: unknown) {
          showAlert(error instanceof Error ? error.message : 'Fehler beim Löschen des Nutzers', 'error');
        } finally {
          setDeletingUserId(null);
        }
      },
    });
  };

  const fetchMessages = async () => {
    try {
      const { data: allMessages } = await supabase
        .from('maintenance_messages')
        .select('id, message, is_active, created_at, updated_at')
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
      showAlert('Bitte geben Sie eine Nachricht ein', 'error');
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
      showAlert('Wartungsmeldung erstellt!', 'success');
    } catch (error) {
      console.error('Error creating message:', error);
      showAlert('Fehler beim Erstellen', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleEditMessage = async () => {
    if (!editingMessage) return;
    if (!messageText.trim()) {
      showAlert('Bitte geben Sie eine Nachricht ein', 'error');
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
      showAlert('Wartungsmeldung aktualisiert!', 'success');
    } catch (error) {
      console.error('Error updating message:', error);
      showAlert('Fehler beim Aktualisieren', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteMessage = async (id: string) => {
    setConfirmPopup({
      title: 'Meldung löschen?',
      message: 'Möchten Sie diese Wartungsmeldung wirklich löschen?',
      confirmLabel: 'Löschen',
      cancelLabel: 'Abbrechen',
      variant: 'danger',
      onConfirm: async () => {
        try {
          const response = await fetch(`/api/maintenance/${id}`, {
            method: 'DELETE',
          });

          if (!response.ok) {
            throw new Error('Failed to delete message');
          }

          await fetchMessages();
          showAlert('Wartungsmeldung gelöscht', 'success');
        } catch (error) {
          console.error('Error deleting message:', error);
          showAlert('Fehler beim Löschen', 'error');
        }
      },
    });
  };

  const openEditModal = (message: MaintenanceMessage) => {
    setEditingMessage(message);
    setMessageText(message.message);
    setIsActive(message.is_active);
    setShowEditModal(true);
  };

  if (loading) {
    return showLoader ? <LoadingScreen /> : null;
  }

  if (!isAdmin) {
    return null;
  }

  const activeMessages = messages.filter(m => m.is_active);
  const inactiveMessages = messages.filter(m => !m.is_active);

  return (
    <div className="h-[100dvh] overflow-y-auto overflow-x-hidden bg-gradient-to-b from-[#0a0a0a] via-[#121212] to-[#1a1a1a] text-white">
      <AuthBackground />

      <div className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 py-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8 card-stagger-1">
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
            className="w-full sm:w-auto sm:self-auto px-4 py-2 rounded-lg bg-blue-500 hover:bg-blue-600 transition-all flex items-center justify-center gap-2 font-medium hover:scale-105 hover:shadow-lg hover:shadow-blue-500/50"
          >
            <Plus className="w-5 h-5" />
            Neue Meldung
          </button>
        </div>

        <div className="mb-8 grid grid-cols-1 xl:grid-cols-3 gap-6">
          <div className="xl:col-span-1 backdrop-blur-xl bg-white/5 border border-white/10 rounded-2xl p-5 card-stagger-2">
            <h2 className="text-xl font-semibold mb-2 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-orange-300" /> Wartungsmodus
            </h2>
            <p className="text-sm text-gray-400 mb-4">
              Bei aktivem Wartungsmodus können sich nur Admins einloggen, Registrierung ist gesperrt.
            </p>

            <button
              onClick={toggleMaintenanceMode}
              disabled={maintenanceLoading}
              className={`w-full py-3 rounded-xl border transition-all flex items-center justify-center gap-2 font-medium disabled:opacity-60 ${
                maintenanceMode
                  ? 'bg-gradient-to-r from-fuchsia-500/30 via-purple-500/30 to-cyan-500/30 border-purple-300/40 text-white hover:from-fuchsia-500/40 hover:to-cyan-500/40'
                  : 'bg-white/10 border-white/20 text-gray-200 hover:bg-white/20'
              }`}
            >
              {maintenanceMode ? <ToggleRight className="w-5 h-5" /> : <ToggleLeft className="w-5 h-5" />}
              {maintenanceLoading
                ? 'Wird gespeichert...'
                : maintenanceMode
                ? 'Wartungsmodus aktiv'
                : 'Wartungsmodus inaktiv'}
            </button>
          </div>

          <div className="xl:col-span-2 backdrop-blur-xl bg-white/5 border border-white/10 rounded-2xl p-5 card-stagger-3">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4 gap-3">
              <h2 className="text-xl font-semibold flex items-center gap-2">
                <Users className="w-5 h-5 text-blue-300" /> Nutzerverwaltung
              </h2>
              <button
                onClick={fetchUsers}
                disabled={usersLoading}
                className="w-full sm:w-auto px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 border border-white/20 text-sm transition-all disabled:opacity-60"
              >
                {usersLoading ? 'Lädt...' : 'Aktualisieren'}
              </button>
            </div>

            {usersLoading ? (
              <p className="text-sm text-gray-400">Nutzer werden geladen...</p>
            ) : users.length === 0 ? (
              <p className="text-sm text-gray-400">Keine Nutzer gefunden.</p>
            ) : (
              <div className="space-y-3 max-h-[460px] overflow-y-auto pr-1">
                {users.map((account, index) => {
                  const isCurrentUser = account.id === currentUserId;
                  return (
                    <div
                      key={account.id}
                      className="p-4 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-all content-fade-in"
                      style={{ animationDelay: `${Math.min(index * 40, 320)}ms` }}
                    >
                      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-sm font-semibold truncate">{account.email}</p>
                          <p className="text-xs text-gray-400 mt-1">
                            {`${account.first_name || ''} ${account.last_name || ''}`.trim() || 'Kein Name'}
                            {account.class_name ? ` • ${account.class_name}` : ''}
                          </p>
                        </div>

                        <div className="flex flex-wrap items-center gap-2">
                          <button
                            onClick={() => handleUpdateUser(account.id, { role: account.role === 'admin' ? 'user' : 'admin' })}
                            disabled={Boolean(updatingUserId) || isCurrentUser}
                            className="px-3 py-1.5 rounded-lg bg-blue-500/20 hover:bg-blue-500/30 border border-blue-400/30 text-blue-200 text-xs transition-all disabled:opacity-50"
                            title={isCurrentUser ? 'Eigenes Konto hier nicht änderbar' : 'Rolle wechseln'}
                          >
                            Rolle: {account.role === 'admin' ? 'Admin' : 'User'}
                          </button>

                          <button
                            onClick={() => handleUpdateUser(account.id, { is_blocked: !account.is_blocked })}
                            disabled={Boolean(updatingUserId) || isCurrentUser}
                            className={`px-3 py-1.5 rounded-lg border text-xs transition-all disabled:opacity-50 ${
                              account.is_blocked
                                ? 'bg-emerald-500/20 border-emerald-400/30 text-emerald-200 hover:bg-emerald-500/30'
                                : 'bg-amber-500/20 border-amber-400/30 text-amber-100 hover:bg-amber-500/30'
                            }`}
                            title={isCurrentUser ? 'Eigenes Konto hier nicht änderbar' : 'Sperrstatus ändern'}
                          >
                            {account.is_blocked ? (
                              <span className="flex items-center gap-1"><Unlock className="w-3.5 h-3.5" /> Entsperren</span>
                            ) : (
                              <span className="flex items-center gap-1"><Lock className="w-3.5 h-3.5" /> Sperren</span>
                            )}
                          </button>

                          <button
                            onClick={() => handleDeleteUser(account.id, account.email)}
                            disabled={Boolean(deletingUserId) || isCurrentUser}
                            className="px-3 py-1.5 rounded-lg bg-red-500/20 hover:bg-red-500/30 border border-red-400/30 text-red-200 text-xs transition-all disabled:opacity-50"
                            title={isCurrentUser ? 'Eigenes Konto hier nicht löschbar' : 'Nutzer löschen'}
                          >
                            <span className="flex items-center gap-1"><Trash2 className="w-3.5 h-3.5" /> Löschen</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
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
      {alertPopup && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[70] modal-backdrop-animate">
          <div className="bg-gradient-to-b from-[#1a1a1a] to-[#0f0f0f] border border-white/10 rounded-2xl p-6 max-w-md w-full mx-4 modal-animate">
            <div className="flex justify-between items-center mb-4 gap-4">
              <h2 className="text-xl font-semibold flex items-center gap-2">
                <AlertTriangle className={`w-5 h-5 ${
                  alertPopup.type === 'success'
                    ? 'text-emerald-300'
                    : alertPopup.type === 'error'
                    ? 'text-red-300'
                    : 'text-blue-300'
                }`} />
                {alertPopup.title}
              </h2>
              <button
                onClick={() => setAlertPopup(null)}
                className="p-2 rounded-lg hover:bg-white/10 transition-all"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-gray-200 leading-relaxed">{alertPopup.message}</p>

            <div className="mt-6">
              <button
                onClick={() => setAlertPopup(null)}
                className="w-full py-2.5 rounded-lg bg-white/10 hover:bg-white/20 border border-white/20 transition-all"
              >
                OK
              </button>
            </div>
          </div>
        </div>
      )}

      {confirmPopup && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[80] modal-backdrop-animate">
          <div className="bg-gradient-to-b from-[#1a1a1a] to-[#0f0f0f] border border-white/10 rounded-2xl p-6 max-w-md w-full mx-4 modal-animate">
            <h2 className="text-xl font-semibold mb-3">{confirmPopup.title}</h2>
            <p className="text-gray-300 leading-relaxed">{confirmPopup.message}</p>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => {
                  if (confirmLoading) return;
                  setConfirmPopup(null);
                }}
                disabled={confirmLoading}
                className="flex-1 py-2.5 rounded-lg bg-white/10 hover:bg-white/20 border border-white/20 transition-all disabled:opacity-60"
              >
                {confirmPopup.cancelLabel || 'Abbrechen'}
              </button>
              <button
                onClick={async () => {
                  try {
                    setConfirmLoading(true);
                    await confirmPopup.onConfirm();
                    setConfirmPopup(null);
                  } finally {
                    setConfirmLoading(false);
                  }
                }}
                disabled={confirmLoading}
                className={`flex-1 py-2.5 rounded-lg transition-all disabled:opacity-60 ${
                  confirmPopup.variant === 'danger'
                    ? 'bg-red-500/80 hover:bg-red-500 text-white'
                    : 'bg-blue-500 hover:bg-blue-600 text-white'
                }`}
              >
                {confirmLoading ? 'Bitte warten...' : confirmPopup.confirmLabel}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
