'use client';
import { createContext, useContext, useEffect, useState } from 'react';
import { createClient } from '@/utils/supabase/client';
import type { User, Session } from '@supabase/supabase-js';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);
const SESSION_STORAGE_KEY = 'sb_auth_session';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    let isMounted = true;

    const initializeAuth = async () => {
      try {
        // Versuche zuerst, die Session aus der Middleware/Cookies zu laden
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (isMounted) {
          if (session) {
            setSession(session);
            setUser(session?.user ?? null);
            // Speichere die Session im localStorage als Backup
            if (typeof window !== 'undefined') {
              localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify({
                session,
                timestamp: Date.now(),
              }));
            }
          } else {
            // Falls keine Session in Cookies, versuche localStorage zu laden
            if (typeof window !== 'undefined') {
              const stored = localStorage.getItem(SESSION_STORAGE_KEY);
              if (stored) {
                try {
                  const { session: savedSession } = JSON.parse(stored);
                  setSession(savedSession);
                  setUser(savedSession?.user ?? null);
                } catch (e) {
                  console.error('Failed to parse stored session:', e);
                  setSession(null);
                  setUser(null);
                  localStorage.removeItem(SESSION_STORAGE_KEY);
                }
              } else {
                setSession(null);
                setUser(null);
              }
            }
          }
        }
      } catch (error) {
        console.error('Auth initialization error:', error);
        if (isMounted) {
          setSession(null);
          setUser(null);
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    initializeAuth();

    // Überwache Auth-Änderungen
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        if (isMounted) {
          setSession(session);
          setUser(session?.user ?? null);
          
          // Speichere jeden Auth-Change
          if (typeof window !== 'undefined') {
            if (session) {
              localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify({
                session,
                timestamp: Date.now(),
              }));
            } else {
              localStorage.removeItem(SESSION_STORAGE_KEY);
            }
          }
        }
      }
    );

    return () => {
      isMounted = false;
      subscription?.unsubscribe();
    };
  }, [supabase]);

  return (
    <AuthContext.Provider value={{ user, session, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
