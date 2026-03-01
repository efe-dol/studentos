-- Erstelle Termine-Tabelle
CREATE TABLE IF NOT EXISTS public.appointments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  starts_at TIMESTAMP WITH TIME ZONE NOT NULL,
  color VARCHAR(20) DEFAULT '#3b82f6',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Erstelle Indizes für schnellere Abfragen
CREATE INDEX IF NOT EXISTS idx_appointments_user_id ON public.appointments(user_id);
CREATE INDEX IF NOT EXISTS idx_appointments_starts_at ON public.appointments(starts_at);

-- Aktiviere Row Level Security
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;

-- RLS-Richtlinien für appointments-Tabelle

-- Erlaubt Benutzern, ihre eigenen Termine einzufügen
CREATE POLICY "Users can insert their own appointments"
ON public.appointments
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Erlaubt Benutzern, ihre eigenen Termine anzuzeigen
CREATE POLICY "Users can view their own appointments"
ON public.appointments
FOR SELECT
USING (auth.uid() = user_id);

-- Erlaubt Benutzern, ihre eigenen Termine zu aktualisieren
CREATE POLICY "Users can update their own appointments"
ON public.appointments
FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Erlaubt Benutzern, ihre eigenen Termine zu löschen
CREATE POLICY "Users can delete their own appointments"
ON public.appointments
FOR DELETE
USING (auth.uid() = user_id);

-- Trigger zum automatischen Aktualisieren von updated_at
CREATE TRIGGER set_appointments_updated_at
  BEFORE UPDATE ON public.appointments
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();
