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
