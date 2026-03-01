-- Secure RLS configuration for profiles
-- Keeps registration working while preventing unrestricted access/escalation

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Clean up potentially old policy names
DROP POLICY IF EXISTS "Anyone can insert a profile during signup" ON public.profiles;
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can delete their own profile" ON public.profiles;

DROP POLICY IF EXISTS "profiles_insert_own" ON public.profiles;
DROP POLICY IF EXISTS "profiles_select_own" ON public.profiles;
DROP POLICY IF EXISTS "profiles_update_own_no_role_change" ON public.profiles;
DROP POLICY IF EXISTS "profiles_delete_own" ON public.profiles;

-- Registration: user may insert only own row
CREATE POLICY "profiles_insert_own"
ON public.profiles
FOR INSERT
WITH CHECK (auth.uid() = id);

-- Read: user may read only own profile
CREATE POLICY "profiles_select_own"
ON public.profiles
FOR SELECT
USING (auth.uid() = id);

-- Update: user may update only own profile and must not change role
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
);

-- Delete: optional self-delete only
CREATE POLICY "profiles_delete_own"
ON public.profiles
FOR DELETE
USING (auth.uid() = id);

-- Ensure profile row exists right after signup (auth.users insert)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (
    id,
    first_name,
    last_name,
    class_name,
    birthdate,
    school,
    role
  )
  VALUES (
    NEW.id,
    '',
    '',
    '',
    NULL,
    'Gymnasium Weilheim i.OB',
    'user'
  )
  ON CONFLICT (id) DO NOTHING;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();
