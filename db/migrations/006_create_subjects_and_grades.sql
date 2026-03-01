-- Subjects (Fächer) Tabelle
CREATE TABLE IF NOT EXISTS public.subjects (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  type VARCHAR(20) NOT NULL CHECK (type IN ('HAUPTFACH', 'NEBENFACH')),
  color VARCHAR(7) NOT NULL DEFAULT '#3b82f6',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_subjects_user_id ON public.subjects(user_id);
CREATE INDEX IF NOT EXISTS idx_subjects_type ON public.subjects(type);

-- Grades (Noten) Tabelle
CREATE TABLE IF NOT EXISTS public.grades (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  subject_id UUID NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  grade DECIMAL(3,1) NOT NULL CHECK (grade >= 1 AND grade <= 6),
  grade_type VARCHAR(50) NOT NULL CHECK (grade_type IN ('SCHULAUFGABE', 'MÜNDLICH', 'KURZARBEIT', 'KSL')),
  weight DECIMAL(3,2) NOT NULL DEFAULT 1.0 CHECK (weight > 0),
  description TEXT,
  grade_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_grades_subject_id ON public.grades(subject_id);
CREATE INDEX IF NOT EXISTS idx_grades_user_id ON public.grades(user_id);
CREATE INDEX IF NOT EXISTS idx_grades_type ON public.grades(grade_type);

-- Aktiviere Row Level Security
ALTER TABLE public.subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.grades ENABLE ROW LEVEL SECURITY;

-- RLS-Richtlinien für subjects-Tabelle
CREATE POLICY "Users can insert their own subjects"
ON public.subjects
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own subjects"
ON public.subjects
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own subjects"
ON public.subjects
FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own subjects"
ON public.subjects
FOR DELETE
USING (auth.uid() = user_id);

-- RLS-Richtlinien für grades-Tabelle
CREATE POLICY "Users can insert their own grades"
ON public.grades
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own grades"
ON public.grades
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own grades"
ON public.grades
FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own grades"
ON public.grades
FOR DELETE
USING (auth.uid() = user_id);

-- Trigger für updated_at
CREATE TRIGGER set_subjects_updated_at
  BEFORE UPDATE ON public.subjects
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER set_grades_updated_at
  BEFORE UPDATE ON public.grades
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();
