import type { NextConfig } from "next";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseOrigin = supabaseUrl ? new URL(supabaseUrl).origin : "";
const supabaseWsOrigin = supabaseOrigin ? supabaseOrigin.replace("https://", "wss://") : "";
const formspreeOrigin = "https://formspree.io";

// NOTE: script-src keeps 'unsafe-inline'. Next.js injects unkeyed inline
// bootstrap scripts into every statically prerendered page; a nonce/hash-only
// script-src would block them and break hydration unless the whole app is
// switched to per-request dynamic rendering. The app has no HTML-injection
// sink (no dangerouslySetInnerHTML / innerHTML / eval, React auto-escaping),
// so this is a defence-in-depth gap, not an exploitable hole.
const csp = [
  "default-src 'self'",
  `connect-src 'self' ${supabaseOrigin} ${supabaseWsOrigin} ${formspreeOrigin}`.trim(),
  "img-src 'self' data: blob: https:",
  "font-src 'self' data: https://fonts.gstatic.com",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "script-src 'self' 'unsafe-inline'",
  "worker-src 'self' blob:",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  `form-action 'self' ${formspreeOrigin}`,
  "object-src 'none'",
  "upgrade-insecure-requests",
].join("; ");

const nextConfig: NextConfig = {
  poweredByHeader: false,
  reactStrictMode: true,
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "Content-Security-Policy", value: csp },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
          { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
          {
            key: "Strict-Transport-Security",
            value: "max-age=31536000; includeSubDomains; preload",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
