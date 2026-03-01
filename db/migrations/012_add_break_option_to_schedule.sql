-- Erlaubt Pause-Einträge im Stundenplan
ALTER TABLE public.schedule_entries
ADD COLUMN IF NOT EXISTS is_break BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE public.schedule_entries
ALTER COLUMN subject_id DROP NOT NULL;

ALTER TABLE public.schedule_entries
DROP CONSTRAINT IF EXISTS schedule_entries_subject_or_break_check;

ALTER TABLE public.schedule_entries
ADD CONSTRAINT schedule_entries_subject_or_break_check
CHECK (
  (is_break = TRUE AND subject_id IS NULL)
  OR
  (is_break = FALSE AND subject_id IS NOT NULL)
);

CREATE INDEX IF NOT EXISTS idx_schedule_entries_is_break
ON public.schedule_entries(is_break);
