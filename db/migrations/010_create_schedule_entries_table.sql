-- Stundenplan Tabelle
CREATE TABLE IF NOT EXISTS public.schedule_entries (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  subject_id UUID NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
  weekday VARCHAR(10) NOT NULL CHECK (weekday IN ('monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday')),
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  room TEXT,
  teacher TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT schedule_entries_time_order CHECK (start_time < end_time)
);

CREATE INDEX IF NOT EXISTS idx_schedule_entries_user_id ON public.schedule_entries(user_id);
CREATE INDEX IF NOT EXISTS idx_schedule_entries_weekday_start_time ON public.schedule_entries(weekday, start_time);

ALTER TABLE public.schedule_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can insert their own schedule entries"
ON public.schedule_entries
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own schedule entries"
ON public.schedule_entries
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own schedule entries"
ON public.schedule_entries
FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own schedule entries"
ON public.schedule_entries
FOR DELETE
USING (auth.uid() = user_id);

CREATE TRIGGER set_schedule_entries_updated_at
  BEFORE UPDATE ON public.schedule_entries
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();
