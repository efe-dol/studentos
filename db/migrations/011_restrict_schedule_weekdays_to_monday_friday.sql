-- Entfernt Wochenend-Einträge und erzwingt Montag-Freitag im Stundenplan
DELETE FROM public.schedule_entries
WHERE weekday IN ('saturday', 'sunday');

ALTER TABLE public.schedule_entries
DROP CONSTRAINT IF EXISTS schedule_entries_weekday_check;

ALTER TABLE public.schedule_entries
ADD CONSTRAINT schedule_entries_weekday_check
CHECK (weekday IN ('monday', 'tuesday', 'wednesday', 'thursday', 'friday'));
