# Security operations checklist – StudentOS

Some controls cannot live in this repository. They must be configured in the
Supabase project and the Vercel project. Verify each item after every
environment/project change.

## Supabase – Auth settings (dashboard → Authentication)

- **Rate limiting**: keep the built-in auth rate limits enabled. Login,
  sign-up and password-reset requests go **directly** from the browser to
  Supabase Auth and are *not* covered by the app's own rate limiter
  (`proxy.ts`). Lower the "Sign in / Sign up" and "Token refresh" limits to
  the strictest values that still work for real users.
- **Email confirmation**: enable "Confirm email" so unverified accounts cannot
  be used.
- **Leaked-password protection**: enable it. The app's `/api/auth/register`
  route enforces min length 8 + upper/lower/digit, but Supabase's own policy is
  the authoritative server gate for any signup that bypasses the route — set it
  at least as strict (min length >= 8, character-class mix).
- **Confirm email**: must be ON — the registration flow relies on the
  double-opt-in link and the profile is populated from signup metadata by the
  `handle_new_user` trigger (migration 023).
- **Prevent user enumeration**: keep the "return generic error on sign-up for
  existing email" behaviour enabled (default in recent Supabase).
- **JWT expiry**: keep the access-token TTL short (default 3600 s). The app
  refreshes tokens server-side in `proxy.ts` via `getUser()`.
- **Password reset**: there is no in-app reset flow. Either enable Supabase's
  hosted reset pages and link to them, or add a reset route. Do not ship
  without a working reset path.
- **Redirect allow-list**: restrict "Redirect URLs" to the production and
  preview domains only.

## Supabase – Database

- Apply migrations in order. `db/migrations/019`–`021` contain the security
  hardening; `002`, `005`, `007`, `017` were also updated to their hardened
  end state so re-running them in isolation is safe.
- After applying migrations, confirm:
  - every table in `public` has `rowsecurity = true`
    (`select relname from pg_class where relnamespace = 'public'::regnamespace and relkind = 'r' and not relrowsecurity;`
    must return no rows);
  - `select proname, prosecdef, proconfig from pg_proc where pronamespace = 'public'::regnamespace and prosecdef;`
    shows a `search_path=...` entry in `proconfig` for every `SECURITY DEFINER`
    function;
  - `delete_old_completed_todos`, `check_rate_limit`, `prune_api_rate_limits`,
    `get_schedule_share`, `is_admin_user` are **not** executable by `anon`
    except where intended (`get_schedule_share`, `check_rate_limit` are).
- Schedule the cleanup jobs (pg_cron or external):
  `select public.delete_old_completed_todos();` daily and
  `select public.prune_api_rate_limits();` hourly.
- Rotate `SUPABASE_SERVICE_ROLE_KEY` if it was ever exposed. It is only read
  server-side (`lib/supabase/admin.ts`) by `/api/admin/*`, `/api/account`,
  `/api/maintenance-mode` and `/api/notifications/process`.

## Vercel / deployment

- Set all server-only env vars (`SUPABASE_SERVICE_ROLE_KEY`,
  `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT`, `CRON_SECRET`) as **encrypted**,
  non-`NEXT_PUBLIC_` variables.
- `CRON_SECRET` must be a long random string; it is the only thing protecting
  `/api/notifications/process`.
- Confirm HTTPS-only + HSTS (header is set in `next.config.ts`).

## Known accepted residual risks

- `Content-Security-Policy` keeps `script-src 'unsafe-inline'`. A nonce/hash
  script policy would break hydration of the statically prerendered pages
  unless the whole app is switched to per-request dynamic rendering. There is
  no HTML-injection sink in the codebase (no `dangerouslySetInnerHTML` /
  `innerHTML` / `eval`), so this is defence-in-depth only.
- The in-memory rate limiter is per serverless instance. The durable
  DB-backed limiter (`check_rate_limit`) is applied only to the sensitive API
  prefixes and fails open on DB error.
- Feedback form posts name + message to Formspree (US). A DPA/AVV with
  Formspree and coverage in the privacy notice are required.
