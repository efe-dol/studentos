'use client';
import { AuthProvider } from '@/lib/supabase/auth-provider';

export function SessionProvider({ children }: { children: React.ReactNode }) {
  return <AuthProvider>{children}</AuthProvider>;
}
