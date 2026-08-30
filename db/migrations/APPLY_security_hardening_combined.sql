-- ============================================================
-- StudentOS – combined apply script (security + feature migrations)
-- Run once, in order, on an already-deployed database.
-- Safe to re-run: every statement is idempotent.
-- ============================================================


-- >>>>>>>>>> 019_security_hardening.sql >>>>>>>>>>

-- Security hardening migration
--
-- 1. Prevent users from clearing their own admin-set "is_blocked" flag via RLS.
-- 2. Stop leaking every user's shared timetable to all authenticated users;
--    keep token-based import working through a SECURITY DEFINER lookup.
-- 3. Pin search_path on the remaining SECURITY DEFINER function.


-- ---------------------------------------------------------------------------
-- 1. profiles: freeze privilege-relevant columns on self-update
-- ---------------------------------------------------------------------------
-- The previous policy only froze "role". A blocked user could still call
-- PostgREST directly (anon key) and run
--   update profiles set is_blocked = false where id = auth.uid()
-- to lift an admin block. The account block is a security control, so the
-- flag must be immutable for the affected user.

DROP POLICY IF EXISTS "profiles_update_own_no_role_change" ON public.profiles;
CREATE POLICY "profiles_update_own_no_role_change"
ON public.profiles
FOR UPDATE
USING (auth.uid() = id)
WITH CHECK (
  auth.uid() = id
  AND role = (
    SELECT p.role
    FROM public.profiles p
    WHERE p.id = auth.uid()
  )
  AND is_blocked = (
    SELECT p.is_blocked
    FROM public.profiles p
    WHERE p.id = auth.uid()
  )
);

-- Admins keep full access through the separate "profiles_admin_update_all"
-- policy (permissive policies are OR-ed), so admin-driven block/unblock and
-- role changes are unaffected.


-- ---------------------------------------------------------------------------
-- 2. schedule_shares: restrict direct reads to the owner
-- ---------------------------------------------------------------------------
-- The old SELECT policy allowed ANY authenticated user to read EVERY
-- non-expired row (full timetable payload, teacher/room names, created_by
-- user id). A single logged-in student could dump all shared schedules.
--
-- Direct table reads are now owner-only. Importing someone else's schedule
-- goes through a SECURITY DEFINER function that only returns a row when the
-- caller already knows the unguessable share token.

DROP POLICY IF EXISTS "Authenticated users can read active schedule shares" ON public.schedule_shares;

DROP POLICY IF EXISTS "Users can read their own schedule shares" ON public.schedule_shares;
CREATE POLICY "Users can read their own schedule shares"
ON public.schedule_shares
FOR SELECT
USING (auth.uid() = created_by);

CREATE OR REPLACE FUNCTION public.get_schedule_share(share_token UUID)
RETURNS TABLE (payload JSONB, expires_at TIMESTAMPTZ)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT s.payload, s.expires_at
  FROM public.schedule_shares s
  WHERE s.token = share_token;
$$;

REVOKE ALL ON FUNCTION public.get_schedule_share(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_schedule_share(UUID) TO authenticated;


-- ---------------------------------------------------------------------------
-- 3. Pin search_path on delete_old_completed_todos (SECURITY DEFINER)
-- ---------------------------------------------------------------------------
-- Without a fixed search_path a SECURITY DEFINER function is vulnerable to
-- object-resolution hijacking via a caller-controlled search_path.

CREATE OR REPLACE FUNCTION public.delete_old_completed_todos()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  DELETE FROM public.todos
  WHERE is_completed = TRUE
  AND updated_at < NOW() - INTERVAL '30 days';
END;
$$;


-- >>>>>>>>>> 020_security_hardening_round2.sql >>>>>>>>>>

-- Security hardening – round 2 (adversarial review)
--
-- 1. CRITICAL: close a self-service privilege-escalation path on public.profiles
--    (a user could DELETE their own profile row and then re-INSERT it with
--     role = 'admin', because the INSERT policy only checked the id).
-- 2. Lock down the SECURITY DEFINER cleanup function so it is no longer
--    callable by anon / authenticated (it deletes rows across ALL users).
-- 3. Stop exposing the admin user id (app_settings.updated_by /
--    maintenance_messages.created_by) to unauthenticated clients.


-- ---------------------------------------------------------------------------
-- 1. profiles: no self-delete, and self-insert may only create a plain user
-- ---------------------------------------------------------------------------
-- Attack chain (before):
--   delete from profiles where id = auth.uid();            -- profiles_delete_own
--   insert into profiles (id, role) values (auth.uid(), 'admin');  -- profiles_insert_own (id-only check)
-- => caller becomes admin (can then read every profile, list all users +
--    emails, delete/block accounts, toggle maintenance mode).
--
-- No feature in the app deletes a profile row directly (account deletion runs
-- through the service role on auth.users with ON DELETE CASCADE), so removing
-- the self-delete policy is safe.

DROP POLICY IF EXISTS "profiles_delete_own" ON public.profiles;

DROP POLICY IF EXISTS "profiles_insert_own" ON public.profiles;
CREATE POLICY "profiles_insert_own"
ON public.profiles
FOR INSERT
WITH CHECK (
  auth.uid() = id
  AND COALESCE(role, 'user') = 'user'
  AND COALESCE(is_blocked, FALSE) = FALSE
);

-- The signup trigger public.handle_new_user() runs as SECURITY DEFINER (table
-- owner) and is unaffected by RLS; it already inserts role = 'user'.
-- Admin-initiated role changes go through the separate
-- "profiles_admin_update_all" policy / the service-role client and are an
-- UPDATE, not an INSERT, so they keep working.


-- ---------------------------------------------------------------------------
-- 2. delete_old_completed_todos(): remove PUBLIC execute
-- ---------------------------------------------------------------------------
-- SECURITY DEFINER + default PUBLIC execute meant ANY caller (even anon with
-- just the public anon key) could invoke
--   POST /rest/v1/rpc/delete_old_completed_todos
-- and delete completed todos older than 30 days for EVERY user, bypassing RLS.
-- Only the scheduled job (service_role / postgres) needs it.

REVOKE ALL ON FUNCTION public.delete_old_completed_todos() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.delete_old_completed_todos() FROM anon;
REVOKE ALL ON FUNCTION public.delete_old_completed_todos() FROM authenticated;


-- ---------------------------------------------------------------------------
-- 3. Do not leak the admin user id to clients
-- ---------------------------------------------------------------------------
-- app_settings.updated_by and maintenance_messages.created_by hold an admin
-- auth.users id. Both tables are world-readable (RLS USING (true) /
-- USING (is_active)), so any visitor could read these ids with a direct
-- PostgREST select. RLS cannot filter columns, so restrict the column grants.

REVOKE SELECT ON public.app_settings FROM anon;
REVOKE SELECT ON public.app_settings FROM authenticated;
GRANT SELECT (id, maintenance_mode) ON public.app_settings TO anon;
GRANT SELECT (id, maintenance_mode) ON public.app_settings TO authenticated;

REVOKE SELECT ON public.maintenance_messages FROM anon;
GRANT SELECT (id, message, is_active, created_at, updated_at)
  ON public.maintenance_messages TO anon;
-- (authenticated keeps full column read; the /api/maintenance route already
--  projects a safe column list, and admins legitimately manage these rows.)


-- >>>>>>>>>> 021_privacy_and_hardening.sql >>>>>>>>>>

-- Privacy (data minimisation) + remaining hardening from the 2nd audit's
-- residual-risk list.
--
-- 1. Drop personal data that the app does not need: profiles.birthdate,
--    push_subscriptions.user_agent.
-- 2. Enforce role / is_blocked immutability for non-admins with a BEFORE
--    trigger (more robust than the RLS sub-select alone).
-- 3. Hide maintenance_messages.created_by from authenticated clients too.
-- 4. Clean up any push subscription pointing at a non-push host (SSRF).
-- 5. Durable, cross-instance rate limiting primitive for sensitive endpoints.


-- ---------------------------------------------------------------------------
-- 1. Data minimisation
-- ---------------------------------------------------------------------------
ALTER TABLE public.profiles          DROP COLUMN IF EXISTS birthdate;
ALTER TABLE public.push_subscriptions DROP COLUMN IF EXISTS user_agent;

-- Recreate the signup trigger function without birthdate.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  INSERT INTO public.profiles (id, first_name, last_name, class_name, school, role)
  VALUES (NEW.id, '', '', '', 'Gymnasium Weilheim i.OB', 'user')
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;


-- ---------------------------------------------------------------------------
-- 2. Privileged-column protection trigger on profiles
-- ---------------------------------------------------------------------------
-- Belt-and-braces on top of the RLS policies from migrations 019/020:
-- a normal end user can never change role / is_blocked, no matter which
-- statement shape they use. The service role (auth.uid() IS NULL) and admins
-- are unaffected, so admin role/block management keeps working.
CREATE OR REPLACE FUNCTION public.protect_profile_privileged_columns()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF auth.uid() IS NULL OR public.is_admin_user(auth.uid()) THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'INSERT' THEN
    NEW.role := 'user';
    NEW.is_blocked := FALSE;
  ELSIF TG_OP = 'UPDATE' THEN
    NEW.role := OLD.role;
    NEW.is_blocked := OLD.is_blocked;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_protect_profile_privileged_columns ON public.profiles;
CREATE TRIGGER trg_protect_profile_privileged_columns
  BEFORE INSERT OR UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.protect_profile_privileged_columns();


-- ---------------------------------------------------------------------------
-- 3. maintenance_messages.created_by not readable by clients
-- ---------------------------------------------------------------------------
REVOKE SELECT ON public.maintenance_messages FROM authenticated;
GRANT SELECT (id, message, is_active, created_at, updated_at)
  ON public.maintenance_messages TO authenticated;
-- Admin management goes through /api/maintenance* which uses explicit safe
-- column lists; the service-role client is unaffected by table grants.


-- ---------------------------------------------------------------------------
-- 4. Purge push subscriptions with a non-official endpoint (see route allowlist)
-- ---------------------------------------------------------------------------
DELETE FROM public.push_subscriptions
WHERE endpoint !~* '^https://([a-z0-9-]+\.)*(fcm\.googleapis\.com|android\.googleapis\.com|push\.services\.mozilla\.com|notify\.windows\.com|wns\.windows\.com|push\.apple\.com)(/|$)';


-- ---------------------------------------------------------------------------
-- 5. Durable rate limiting (shared across serverless instances)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.api_rate_limits (
  bucket       TEXT PRIMARY KEY,
  window_start TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  hits         INTEGER NOT NULL DEFAULT 0
);

ALTER TABLE public.api_rate_limits ENABLE ROW LEVEL SECURITY;
-- No policies: direct table access is denied for anon/authenticated. Only the
-- SECURITY DEFINER function below may touch it.
REVOKE ALL ON TABLE public.api_rate_limits FROM anon, authenticated;

-- Atomically bump the counter for `bucket` and report whether the caller is
-- over `max_hits` within `window_seconds`. Fixed-window; good enough for
-- abuse control on low-traffic sensitive endpoints.
CREATE OR REPLACE FUNCTION public.check_rate_limit(
  bucket TEXT,
  max_hits INTEGER,
  window_seconds INTEGER
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  current_hits INTEGER;
BEGIN
  IF bucket IS NULL OR length(bucket) = 0 OR length(bucket) > 200 THEN
    RETURN TRUE; -- fail open on malformed input
  END IF;

  INSERT INTO public.api_rate_limits AS r (bucket, window_start, hits)
  VALUES (bucket, NOW(), 1)
  ON CONFLICT (bucket) DO UPDATE
    SET hits = CASE
                 WHEN r.window_start < NOW() - make_interval(secs => window_seconds)
                 THEN 1
                 ELSE r.hits + 1
               END,
        window_start = CASE
                         WHEN r.window_start < NOW() - make_interval(secs => window_seconds)
                         THEN NOW()
                         ELSE r.window_start
                       END
  RETURNING hits INTO current_hits;

  RETURN current_hits <= max_hits;
END;
$$;

REVOKE ALL ON FUNCTION public.check_rate_limit(TEXT, INTEGER, INTEGER) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.check_rate_limit(TEXT, INTEGER, INTEGER) TO anon, authenticated;

-- Opportunistic cleanup helper for the cron (not required for correctness).
CREATE OR REPLACE FUNCTION public.prune_api_rate_limits()
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  DELETE FROM public.api_rate_limits WHERE window_start < NOW() - INTERVAL '1 day';
$$;

REVOKE ALL ON FUNCTION public.prune_api_rate_limits() FROM PUBLIC;


-- >>>>>>>>>> 022_subject_schulaufgaben_weighting.sql >>>>>>>>>>

-- Per-subject control over whether the Schulaufgaben (large written exams)
-- average is weighted double.
--
-- Bavarian rule: for most Hauptfächer (German, Maths, English, ...) the
-- Schulaufgaben average counts twice:
--   subject average = (Ø kleine LN + 2 * Ø Schulaufgabe) / 3
-- but some Hauptfächer (Physik, Chemie, ...) weight it single:
--   subject average = (Ø kleine LN + Ø Schulaufgabe) / 2
--
-- Default TRUE keeps the previous behaviour for all existing subjects.

ALTER TABLE public.subjects
  ADD COLUMN IF NOT EXISTS sa_double BOOLEAN NOT NULL DEFAULT TRUE;


-- >>>>>>>>>> 023_signup_metadata.sql >>>>>>>>>>

-- Registration now runs through /api/auth/register, which passes the name /
-- class as auth user metadata to signUp() instead of the client updating the
-- profile row afterwards (that update needs a session, which does not exist yet
-- when e-mail confirmation is enabled).
--
-- Populate the profile from raw_user_meta_data on signup.

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  INSERT INTO public.profiles (id, first_name, last_name, class_name, school, role)
  VALUES (
    NEW.id,
    LEFT(COALESCE(NULLIF(TRIM(NEW.raw_user_meta_data ->> 'first_name'), ''), ''), 80),
    LEFT(COALESCE(NULLIF(TRIM(NEW.raw_user_meta_data ->> 'last_name'), ''), ''), 80),
    LEFT(COALESCE(NULLIF(TRIM(NEW.raw_user_meta_data ->> 'class_name'), ''), ''), 40),
    'Gymnasium Weilheim i.OB',
    'user'
  )
  ON CONFLICT (id) DO NOTHING;

  RETURN NEW;
END;
$$;

