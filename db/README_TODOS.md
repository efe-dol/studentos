# ToDo Feature - Datenbankeinrichtung

## Übersicht
Die ToDo-Funktion ermöglicht es Benutzern, persönliche Aufgaben zu erstellen, zu verwalten und zu verfolgen. Jeder Benutzer kann seine eigenen ToDos mit verschiedenen Prioritäten und Fälligkeitsdaten erstellen.

## Datenbank-Migrationen ausführen

### Schritt 1: Basis-Tabelle erstellen
1. Öffnen Sie Ihr Supabase-Projekt im Browser
2. Navigieren Sie zu "SQL Editor"
3. Öffnen Sie die Datei `db/migrations/001_create_todos_table.sql`
4. Kopieren Sie den gesamten SQL-Code
5. Fügen Sie ihn in den SQL Editor ein
6. Klicken Sie auf "Run" um die Migration auszuführen

### Schritt 2: Automatische Löschung einrichten
1. Öffnen Sie die Datei `db/migrations/002_auto_delete_completed_todos.sql`
2. Kopieren Sie den SQL-Code
3. Führen Sie ihn im SQL Editor aus

Dies erstellt eine Funktion, die erledigte ToDos nach 30 Tagen automatisch löscht.

**Automatisierung (Optional):**
- **Mit pg_cron (falls verfügbar):** Aktivieren Sie die pg_cron Extension in Supabase und führen Sie den im SQL-File beschriebenen Cron-Job aus
- **Mit externem Cron:** Erstellen Sie einen täglichen Webhook-Aufruf über einen Service wie cron-job.org, der die Funktion aufruft
- **Manuell:** Führen Sie `SELECT public.delete_old_completed_todos();` manuell in regelmäßigen Abständen aus

## Funktionen der ToDo-Seite

### Für Benutzer:
- ✅ Neue ToDos erstellen mit:
  - Titel (Pflichtfeld)
  - Beschreibung (optional)
  - Fälligkeitsdatum (optional)
  - Priorität (Niedrig, Mittel, Hoch, Dringend)
  
- ✅ ToDos bearbeiten und aktualisieren
- ✅ ToDos als erledigt/unerledigt markieren
- ✅ ToDos löschen
- ✅ Übersicht über offene und erledigte Aufgaben
- ✅ Automatische Löschung erledigter ToDos nach 30 Tagen
- ✅ Visuelle Priorisierung mit Farbcodes:
  - 🔴 Dringend (Rot)
  - 🟠 Hoch (Orange)
  - 🟡 Mittel (Gelb)
  - 🟢 Niedrig (Grün)
- ✅ Flüssige Animationen und Hover-Effekte

### Dashboard-Integration:
- Zeigt die neusten 5 ToDos mit höchster Priorität an
- Überfällige ToDos werden hervorgehoben
- Schnellzugriff zur vollständigen ToDo-Seite

## API-Endpunkte

### GET `/api/todos`
Lädt alle ToDos des angemeldeten Benutzers.

**Query-Parameter:**
- `limit`: Anzahl der ToDos (optional)
- `sortBy`: Sortierung (`priority`, `due_date`, `created_at`)
- `onlyIncomplete`: Nur offene ToDos (`true`/`false`)

### POST `/api/todos`
Erstellt ein neues ToDo.

**Body:**
```json
{
  "title": "Aufgabe erledigen",
  "description": "Detaillierte Beschreibung",
  "due_date": "2026-03-15",
  "priority": "high"
}
```

### PATCH `/api/todos/[id]`
Aktualisiert ein bestehendes ToDo.

### DELETE `/api/todos/[id]`
Löscht ein ToDo.

## Sicherheit

Die Datenbank verwendet Row Level Security (RLS) Policies:
- Benutzer können nur ihre eigenen ToDos sehen
- Benutzer können nur ihre eigenen ToDos erstellen, bearbeiten und löschen
- Alle Zugriffe sind über `auth.uid()` geschützt

## Design & Animationen

Die ToDo-Seite verwendet:
- **Staggered Animations:** Elemente erscheinen nacheinander
- **Hover-Effekte:** Buttons und Karten reagieren auf Maus-Interaktionen
- **Modal-Animationen:** Smooth Ein-/Ausblenden der Dialoge
- **Custom Select-Styling:** Dropdown-Menüs im App-Design
- **Responsive Design:** Optimiert für Desktop und Mobile

## Navigation

Die ToDo-Seite ist im Dashboard-Menü unter "ToDos" erreichbar.
