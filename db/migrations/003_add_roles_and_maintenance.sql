-- Füge role-Spalte zur profiles-Tabelle hinzu
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS role VARCHAR(20) DEFAULT 'user' CHECK (role IN ('user', 'admin'));

-- Erstelle Index für schnellere Abfragen
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);

-- Erstelle Tabelle für Wartungsmeldungen
CREATE TABLE IF NOT EXISTS public.maintenance_messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  message TEXT NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Erstelle Index für schnellere Abfragen
CREATE INDEX IF NOT EXISTS idx_maintenance_active ON public.maintenance_messages(is_active);

-- Aktiviere Row Level Security für maintenance_messages
ALTER TABLE public.maintenance_messages ENABLE ROW LEVEL SECURITY;

-- RLS-Richtlinien für maintenance_messages

-- Jeder authentifizierte Benutzer kann aktive Wartungsmeldungen lesen
CREATE POLICY "Anyone can view active maintenance messages"
ON public.maintenance_messages
FOR SELECT
USING (is_active = TRUE);

-- Nur Admins können Wartungsmeldungen erstellen
CREATE POLICY "Only admins can insert maintenance messages"
ON public.maintenance_messages
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin'
  )
);

-- Nur Admins können Wartungsmeldungen aktualisieren
CREATE POLICY "Only admins can update maintenance messages"
ON public.maintenance_messages
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin'
  )
);

-- Nur Admins können Wartungsmeldungen löschen
CREATE POLICY "Only admins can delete maintenance messages"
ON public.maintenance_messages
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin'
  )
);

-- Erstelle Funktion zum Aktualisieren des updated_at-Zeitstempels
CREATE OR REPLACE FUNCTION public.handle_maintenance_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Erstelle Trigger zum automatischen Aktualisieren von updated_at
CREATE TRIGGER set_maintenance_updated_at
  BEFORE UPDATE ON public.maintenance_messages
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_maintenance_updated_at();
