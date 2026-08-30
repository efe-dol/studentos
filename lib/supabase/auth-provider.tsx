'use client';
import { createContext, useContext, useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { User, Session } from '@supabase/supabase-js';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);
// Legacy key: earlier versions cached the full session (incl. refresh token) in
// localStorage. That is a token-leak risk (readable by any script/XSS/extension),
// so we no longer write it and actively clear any leftover value below.
const LEGACY_SESSION_STORAGE_KEY = 'sb_auth_session';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    let isMounted = true;

    const initializeAuth = async () => {
      try {
        // Drop any token cached by older builds.
        if (typeof window !== 'undefined') {
          localStorage.removeItem(LEGACY_SESSION_STORAGE_KEY);
        }

        // Session stammt ausschließlich aus den (httpOnly) Auth-Cookies.
        const { data: { session } } = await supabase.auth.getSession();

        if (isMounted) {
          setSession(session ?? null);
          setUser(session?.user ?? null);
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

          if (typeof window !== 'undefined') {
            localStorage.removeItem(LEGACY_SESSION_STORAGE_KEY);
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
