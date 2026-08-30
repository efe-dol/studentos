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
