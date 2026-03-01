-- Erstelle ToDos-Tabelle
CREATE TABLE IF NOT EXISTS public.todos (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  due_date TIMESTAMP WITH TIME ZONE,
  priority VARCHAR(20) DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  is_completed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Erstelle Indizes für schnellere Abfragen
CREATE INDEX IF NOT EXISTS idx_todos_user_id ON public.todos(user_id);
CREATE INDEX IF NOT EXISTS idx_todos_due_date ON public.todos(due_date);
CREATE INDEX IF NOT EXISTS idx_todos_priority ON public.todos(priority);

-- Aktiviere Row Level Security
ALTER TABLE public.todos ENABLE ROW LEVEL SECURITY;

-- RLS-Richtlinien für todos-Tabelle

-- Erlaubt Benutzern, ihre eigenen ToDos einzufügen
CREATE POLICY "Users can insert their own todos"
ON public.todos
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Erlaubt Benutzern, ihre eigenen ToDos anzuzeigen
CREATE POLICY "Users can view their own todos"
ON public.todos
FOR SELECT
USING (auth.uid() = user_id);

-- Erlaubt Benutzern, ihre eigenen ToDos zu aktualisieren
CREATE POLICY "Users can update their own todos"
ON public.todos
FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Erlaubt Benutzern, ihre eigenen ToDos zu löschen
CREATE POLICY "Users can delete their own todos"
ON public.todos
FOR DELETE
USING (auth.uid() = user_id);

-- Erstelle Funktion zum Aktualisieren des updated_at-Zeitstempels
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Erstelle Trigger zum automatischen Aktualisieren von updated_at
CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON public.todos
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();
