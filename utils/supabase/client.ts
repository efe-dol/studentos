import { createBrowserClient } from '@supabase/ssr'

export const createClient = () => {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      isSingleton: true,
      cookies: {
        getAll() {
          if (typeof document === 'undefined') return [];
          return Array.from(document.cookie.split(';')).map(c => {
            const [name, ...rest] = c.trim().split('=');
            return { name, value: decodeURIComponent(rest.join('=')) };
          });
        },
        setAll(cookies) {
          if (typeof document === 'undefined') return;
          cookies.forEach(({ name, value, options }) => {
            const cookieString = `${name}=${encodeURIComponent(value)}`;
            document.cookie = cookieString;
          });
        },
      },
    }
  )
}
