# StudentOS

StudentOS ist eine von mir entwickelte Web-Application für den Schulalltag.

Die App unterstützt unter anderem bei:

- Aufgaben- und Terminverwaltung
- Stundenplan
- Fächer- und Notenübersicht
- schulnahen Benachrichtigungen

## Entwicklung starten

```bash
npm run dev
```

Die App ist anschließend unter `http://localhost:3000` erreichbar.

## Push-Erinnerungen für Termine (aktuell nicht verfügbar)

Termine unterstützen Push-Benachrichtigungen 1 Woche und 1 Tag vor Startzeit.

1. Migrationen ausführen (inkl. `db/migrations/005_push_notifications_for_appointments.sql`)
2. ENV-Variablen setzen:

```bash
NEXT_PUBLIC_VAPID_PUBLIC_KEY=...
VAPID_PRIVATE_KEY=...
VAPID_SUBJECT=mailto:admin@example.com
SUPABASE_SERVICE_ROLE_KEY=...
CRON_SECRET=ein-langes-zufallsgeheimnis
```

3. Endpoint regelmäßig ausführen (z. B. alle 5 Minuten):

```bash
POST /api/notifications/process
Authorization: Bearer <CRON_SECRET>
```

4. Auf iPad: App zum Home-Bildschirm hinzufügen und im Termine-Tab `Push aktivieren` drücken.

## Versionslog

### v0.3.0 (2026-08-30)

- **Sicherheit & Datenschutz:** umfassendes RLS-Hardening in Supabase (Rollen-/Sperr-Schutz, geschlossene Rechte-Eskalation, Owner-only für geteilte Stundenpläne, `search_path` auf allen SECURITY-DEFINER-Funktionen). Geburtsdatum und `user_agent` werden nicht mehr gespeichert. Selbst-Service für Daten-Export und Konto-Löschung in den Einstellungen. Serverseitige Registrierungs-Route mit Passwort-Mindestanforderungen, E-Mail-Bestätigung (doppelte Eingabe + Double-Opt-In). API-Fehler geben keine DB-Details mehr preis; CSRF-Origin-Check und dauerhaftes Rate-Limiting ergänzt.
- **Noten:** pro Fach einstellbar, ob die Schulaufgabe doppelt zählt – `(KL + 2·GL)/3` (Deutsch/Mathe/…) oder `(KL + GL)/2` (Physik/Chemie/…).
- **UI:** ToDos und Hausaufgaben sind wieder Dashboard-Tabs (eigene Seiten leiten weiter). Alle Dropdowns im App-Design (eigene Select-Komponente). Kompakte „Auf einen Blick“-Leiste im Dashboard-Header (Schnitt, offene ToDos, nächster Termin). Ladeanimation nur noch bei echter Wartezeit und als schlichter Spinner. Fächer/Noten, ToDos und Landingpage deutlich lebendiger animiert. Login blendet „Account erstellen“ im Wartungsmodus aus.
- **Rechtliches:** Datenschutzerklärung und Impressum überarbeitet (Cookies/kein Tracking, Speicherfristen, Double-Opt-In, Drittanbieter).

### v0.2.2 (2026-03-02)

- Stundenplan mit Tages-Tabs (Montag–Freitag) und automatischer Auswahl des aktuellen Wochentags beim Öffnen.
- Tages-Tab und Stundenplan-Formular im Bearbeitungsmodus synchronisiert.
- Notenbezeichnung angepasst: `Schriftliche Leistungskontrolle` → `Stegreifaufgabe`.
- Grammatik in Noten-Texten vereinheitlicht (z. B. `Kleiner/Großer Leistungsnachweis`).
- Dashboard-Notendurchschnitt auf dieselbe Berechnungslogik wie im Tab `Fächer` umgestellt.

### Nächste Version

- Fix für Push-Benachrichtigungen ist weiterhin in Arbeit.

## Copyright

© Efe Dolaman. Alle Rechte vorbehalten.
