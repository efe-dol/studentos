-- Hotfix: behebt rekursive RLS-Policies auf public.profiles

CREATE OR REPLACE FUNCTION public.is_admin_user(check_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE id = check_user_id AND role = 'admin'
  );
$$;

REVOKE ALL ON FUNCTION public.is_admin_user(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_admin_user(UUID) TO authenticated;

DROP POLICY IF EXISTS "profiles_admin_select_all" ON public.profiles;
CREATE POLICY "profiles_admin_select_all"
ON public.profiles
FOR SELECT
USING (public.is_admin_user(auth.uid()));

DROP POLICY IF EXISTS "profiles_admin_update_all" ON public.profiles;
CREATE POLICY "profiles_admin_update_all"
ON public.profiles
FOR UPDATE
USING (public.is_admin_user(auth.uid()))
WITH CHECK (public.is_admin_user(auth.uid()));

DROP POLICY IF EXISTS "profiles_admin_delete_all" ON public.profiles;
CREATE POLICY "profiles_admin_delete_all"
ON public.profiles
FOR DELETE
USING (public.is_admin_user(auth.uid()));
