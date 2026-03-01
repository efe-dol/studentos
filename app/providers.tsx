'use client';
import { AuthProvider } from '@/utils/supabase/auth-provider';

export function SessionProvider({ children }: { children: React.ReactNode }) {
  return <AuthProvider>{children}</AuthProvider>;
}
