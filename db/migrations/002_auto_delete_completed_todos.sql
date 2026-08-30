-- Erstelle Funktion zum automatischen Löschen von erledigten ToDos nach 30 Tagen
-- SECURITY DEFINER: fixed search_path + kein PUBLIC-EXECUTE (siehe Migration 019/020).
CREATE OR REPLACE FUNCTION public.delete_old_completed_todos()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  DELETE FROM public.todos
  WHERE is_completed = TRUE
  AND updated_at < NOW() - INTERVAL '30 days';
END;
$$;

REVOKE ALL ON FUNCTION public.delete_old_completed_todos() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.delete_old_completed_todos() FROM anon;
REVOKE ALL ON FUNCTION public.delete_old_completed_todos() FROM authenticated;

-- Kommentar zur Funktion
COMMENT ON FUNCTION public.delete_old_completed_todos() IS 'Löscht erledigte ToDos, die älter als 30 Tage sind';

-- Hinweis: Diese Funktion kann manuell aufgerufen werden oder per Cron-Job
-- Für automatische Ausführung in Supabase:
-- 1. Gehe zu Database > Extensions
-- 2. Aktiviere "pg_cron" (falls verfügbar)
-- 3. Führe folgenden Befehl aus, um täglich um 3 Uhr morgens zu löschen:
-- 
-- SELECT cron.schedule(
--   'delete-old-completed-todos',
--   '0 3 * * *',
--   'SELECT public.delete_old_completed_todos();'
-- );

-- Alternative: Webhook-basierte Lösung
-- Erstelle einen Edge Function Endpoint, der diese Funktion aufruft
-- und rufe ihn täglich über einen externen Cron-Service auf (z.B. cron-job.org)
