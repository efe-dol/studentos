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
