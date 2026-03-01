-- Erlaubt Benutzern, ihr eigenes Profil während Registrierung zu erstellen
CREATE POLICY "Anyone can insert a profile during signup"
ON public.profiles
FOR INSERT
WITH CHECK (auth.uid() = id);

-- Erlaubt authentifizierten Benutzern, ihr eigenes Profil zu lesen
CREATE POLICY "Users can view their own profile"
ON public.profiles
FOR SELECT
USING (auth.uid() = id);

-- Erlaubt authentifizierten Benutzern, ihr eigenes Profil zu aktualisieren
CREATE POLICY "Users can update their own profile"
ON public.profiles
FOR UPDATE
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- Erlaubt authentifizierten Benutzern, ihr eigenes Profil zu löschen
CREATE POLICY "Users can delete their own profile"
ON public.profiles
FOR DELETE
USING (auth.uid() = id);
