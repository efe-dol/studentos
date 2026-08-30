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
