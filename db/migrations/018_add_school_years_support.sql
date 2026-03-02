CREATE TABLE IF NOT EXISTS public.school_years (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  label TEXT NOT NULL,
  grade_level INTEGER CHECK (grade_level BETWEEN 1 AND 13),
  is_active BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_school_years_user_id ON public.school_years(user_id);
CREATE INDEX IF NOT EXISTS idx_school_years_user_active ON public.school_years(user_id, is_active);

ALTER TABLE public.school_years ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can insert their own school years" ON public.school_years;
CREATE POLICY "Users can insert their own school years"
ON public.school_years
FOR INSERT
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can view their own school years" ON public.school_years;
CREATE POLICY "Users can view their own school years"
ON public.school_years
FOR SELECT
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own school years" ON public.school_years;
CREATE POLICY "Users can update their own school years"
ON public.school_years
FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own school years" ON public.school_years;
CREATE POLICY "Users can delete their own school years"
ON public.school_years
FOR DELETE
USING (auth.uid() = user_id);

DROP TRIGGER IF EXISTS set_school_years_updated_at ON public.school_years;
CREATE TRIGGER set_school_years_updated_at
  BEFORE UPDATE ON public.school_years
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS active_school_year_id UUID REFERENCES public.school_years(id) ON DELETE SET NULL;

ALTER TABLE public.subjects
ADD COLUMN IF NOT EXISTS school_year_id UUID REFERENCES public.school_years(id) ON DELETE CASCADE;

ALTER TABLE public.grades
ADD COLUMN IF NOT EXISTS school_year_id UUID REFERENCES public.school_years(id) ON DELETE CASCADE;

ALTER TABLE public.todos
ADD COLUMN IF NOT EXISTS school_year_id UUID REFERENCES public.school_years(id) ON DELETE CASCADE;

ALTER TABLE public.appointments
ADD COLUMN IF NOT EXISTS school_year_id UUID REFERENCES public.school_years(id) ON DELETE CASCADE;

ALTER TABLE public.homework
ADD COLUMN IF NOT EXISTS school_year_id UUID REFERENCES public.school_years(id) ON DELETE CASCADE;

ALTER TABLE public.schedule_entries
ADD COLUMN IF NOT EXISTS school_year_id UUID REFERENCES public.school_years(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_subjects_school_year_id ON public.subjects(school_year_id);
CREATE INDEX IF NOT EXISTS idx_grades_school_year_id ON public.grades(school_year_id);
CREATE INDEX IF NOT EXISTS idx_todos_school_year_id ON public.todos(school_year_id);
CREATE INDEX IF NOT EXISTS idx_appointments_school_year_id ON public.appointments(school_year_id);
CREATE INDEX IF NOT EXISTS idx_homework_school_year_id ON public.homework(school_year_id);
CREATE INDEX IF NOT EXISTS idx_schedule_entries_school_year_id ON public.schedule_entries(school_year_id);