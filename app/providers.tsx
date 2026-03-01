'use client';
import { useEffect, useState } from 'react';
import { createClient } from '@/utils/supabase/client';

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    const initializeSession = async () => {
      try {
        const supabase = createClient();
        
        // Hole die aktuelle Session
        const { data: { session } } = await supabase.auth.getSession();
        
        // Setze up einen Listener für Auth-Änderungen
        const { data: { subscription } } = supabase.auth.onAuthStateChange(
          async (event, session) => {
            // Session wird automatisch gespeichert durch die Middleware
          }
        );

        setIsInitialized(true);

        return () => {
          subscription?.unsubscribe();
        };
      } catch (error) {
        console.error('Session initialization error:', error);
        setIsInitialized(true);
      }
    };

    initializeSession();
  }, []);

  if (!isInitialized) {
    return null;
  }

  return <>{children}</>;
}
