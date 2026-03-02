# StudentOS

StudentOS ist eine von **Efe Dolaman** entwickelte Schul-App zur Organisation des Schulalltags.

## Zweck der App

StudentOS ist für **private Zwecke im schulischen Umfeld** gedacht.
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

## Push-Erinnerungen für Termine

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

### v0.2.2 (2026-03-02)

- Stundenplan mit Tages-Tabs (Montag–Freitag) und automatischer Auswahl des aktuellen Wochentags beim Öffnen.
- Tages-Tab und Stundenplan-Formular im Bearbeitungsmodus synchronisiert.
- Notenbezeichnung angepasst: `Schriftliche Leistungskontrolle` → `Stegreifaufgabe`.
- Grammatik in Noten-Texten vereinheitlicht (z. B. `Kleiner/Großer Leistungsnachweis`).
- Dashboard-Notendurchschnitt auf dieselbe Berechnungslogik wie im Tab `Fächer` umgestellt.

### Nächste Version

- Fix für Push-Benachrichtigungen ist für die nächste Version geplant.

## Copyright

© Efe Dolaman. Alle Rechte vorbehalten.
