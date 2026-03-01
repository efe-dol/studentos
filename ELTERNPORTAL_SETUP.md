# StudentOS Elternportal - Setup & Testing Guide

## 1. Database Migration einführen

### Supabase Dashboard
1. Gehe zu: https://app.supabase.com
2. Wähle dein Projekt
3. SQL Editor → New Query
4. Kopiere den Inhalt von `app/migrations/001_add_elternportal_column.sql`
5. Führe aus

Alternativ via CLI:
```bash
supabase migration up
```

## 2. Environment Variablen setzen

### Lokal (.env.local)
```bash
cp .env.elternportal.example .env.local
```

Bearbeite `.env.local`:
```env
CREDENTIALS_ENCRYPTION_KEY=GenerateWith: openssl rand -hex 16
GO_BACKEND_URL=http://localhost:8000
```

### Vercel Production
1. Vercel Dashboard öffnen
2. Project Settings → Environment Variables
3. Füge hinzu:
```
CREDENTIALS_ENCRYPTION_KEY=<secure-32-char-key>
GO_BACKEND_URL=https://your-go-backend.vercel.app
```

## 3. Go-Backend Setup

Das Go-Backend sollte einen Endpoint haben:
```
POST /api/vertretungen
Content-Type: application/json

{
  "email": "student@example.com",
  "password": "password123"
}
```

Antwortet mit:
```json
{
  "heute": {
    "motd": "string",
    "vertretungen": [...]
  },
  "morgen": {
    "motd": "string",
    "vertretungen": [...]
  },
  "stand": "01.03.2026 10:15"
}
```

## 4. Testing

### Test 1: Credentials speichern
```bash
curl -X POST http://localhost:3000/api/save-elternportal \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <user-token>" \
  -d '{
    "email": "test@example.com",
    "password": "testpass123"
  }'
```

### Test 2: Vertretungen abrufen
```bash
curl -X GET http://localhost:3000/api/vertretungen \
  -H "Authorization: Bearer <user-token>"
```

### Test 3: UI Test
1. App starten: `npm run dev`
2. Dashboard öffnen
3. Settings (⚙️) → "Elternportal-Zugangsdaten"
4. Credentials eingeben & speichern
5. Vertretungen Tab öffnen
6. Daten sollten angezeigt werden

## 5. Production Deployment

1. Migrationen durchführen (Schritt 1)
2. Environment Variablen setzen (Schritt 2)
3. Go-Backend deployen
4. Next.js App deployen zu Vercel
5. Testen in Production

## Troubleshooting

### "Elternportal-Zugangsdaten nicht konfiguriert"
- User hat kein Elternportal-Konto gepflegt
- Lösung: Settings öffnen → Credentials eingeben

### "Fehler beim Abrufen der Vertretungen"
- Go-Backend erreichbar? `echo $GO_BACKEND_URL`
- Credentials verschlüsselt korrekt? → Logs prüfen
- CORS-Issue? → Go-Backend CORS-Header prüfen

### Encryption-Fehler
- `CREDENTIALS_ENCRYPTION_KEY` nicht korrekt länge (muss 32 chars sein)
- Key neu generieren: `openssl rand -hex 16`

## Security Checklist

- ✅ CREDENTIALS_ENCRYPTION_KEY ist sicher gespeichert
- ✅ Keys nicht in Git committed
- ✅ HTTPS everywhere (Production)
- ✅ Go-Backend nur mit Auth-Token erreichbar
- ✅ Credentials nur per POST & verschlüsselt
- ✅ RLS Policies aktiv in Supabase
