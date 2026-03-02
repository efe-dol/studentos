ALTER TABLE public.subjects
ADD COLUMN IF NOT EXISTS default_room TEXT,
ADD COLUMN IF NOT EXISTS default_teacher TEXT;