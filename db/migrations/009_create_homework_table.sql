-- Hausaufgaben Tabelle
CREATE TABLE IF NOT EXISTS public.homework (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  subject_id UUID NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
  task TEXT NOT NULL,
  homework_date DATE NOT NULL,
  due_date DATE NOT NULL,
  priority VARCHAR(20) NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_homework_user_id ON public.homework(user_id);
CREATE INDEX IF NOT EXISTS idx_homework_due_date ON public.homework(due_date);
CREATE INDEX IF NOT EXISTS idx_homework_created_at ON public.homework(created_at);

ALTER TABLE public.homework ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can insert their own homework"
ON public.homework
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own homework"
ON public.homework
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own homework"
ON public.homework
FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own homework"
ON public.homework
FOR DELETE
USING (auth.uid() = user_id);

CREATE TRIGGER set_homework_updated_at
  BEFORE UPDATE ON public.homework
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();
