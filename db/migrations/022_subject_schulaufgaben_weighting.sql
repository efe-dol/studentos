-- Per-subject control over whether the Schulaufgaben (large written exams)
-- average is weighted double.
--
-- Bavarian rule: for most Hauptfächer (German, Maths, English, ...) the
-- Schulaufgaben average counts twice:
--   subject average = (Ø kleine LN + 2 * Ø Schulaufgabe) / 3
-- but some Hauptfächer (Physik, Chemie, ...) weight it single:
--   subject average = (Ø kleine LN + Ø Schulaufgabe) / 2
--
-- Default TRUE keeps the previous behaviour for all existing subjects.

ALTER TABLE public.subjects
  ADD COLUMN IF NOT EXISTS sa_double BOOLEAN NOT NULL DEFAULT TRUE;
