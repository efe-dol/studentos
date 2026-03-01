# StudentOS Go Backend

Backend service für StudentOS Elternportal-Integration.

## 🚀 Deployment zu Vercel

### 1. Installation von Vercel CLI (falls noch nicht installiert)

```bash
npm install -g vercel
```

### 2. Login bei Vercel

```bash
vercel login
```

### 3. Deploy

Im `go-backend` Verzeichnis:

```bash
# Erster Deploy (erstellt neues Projekt)
vercel

# Production Deploy
vercel --prod
```

### 4. Backend URL kopieren

Nach dem Deployment gibt Vercel eine URL aus, z.B.:
```
https://studentos-backend.vercel.app
```

### 5. In StudentOS eintragen

Öffne `studentos/.env.local` und trage die URL ein:

```env
GO_BACKEND_URL=https://studentos-backend.vercel.app
```

## 📡 API Endpoint

### POST /api/vertretungen

**Request:**
```json
{
  "email": "student@example.com",
  "password": "password123"
}
```

**Response:**
```json
{
  "heute": {
    "motd": "Willkommen im Vertretungsplan",
    "vertretungen": [
      {
        "stunde": "3",
        "betrifft": "10a",
        "vertretung": "Müller",
        "fach": "Mathematik",
        "raum": "A201",
        "info": "Selbststudium"
      }
    ]
  },
  "morgen": {
    "motd": "Aktueller Stand",
    "vertretungen": [...]
  },
  "stand": "01.03.2026 10:15"
}
```

## 🔧 Lokale Entwicklung

```bash
# Go installieren (falls nicht vorhanden)
# Download von https://go.dev/dl/

# Lokal testen mit Vercel CLI
vercel dev
```

## 📝 TODO: Elternportal-Integration

Aktuell werden Mock-Daten zurückgegeben. Um echte Elternportal-Daten zu laden:

1. Implementiere HTTP-Client für Elternportal-Login in `api/vertretungen.go`
2. Parse HTML-Response mit einem Go HTML Parser (z.B. `goquery`)
3. Extrahiere Vertretungsdaten
4. Konvertiere zu JSON-Response

## 🛡️ Sicherheit

- CORS ist aktuell auf `*` gesetzt - in Production auf deine Domain beschränken
- Credentials werden nur temporär verwendet und nicht gespeichert
- SSL/TLS durch Vercel automatisch aktiviert
