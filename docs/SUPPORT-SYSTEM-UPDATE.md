# Support-System + Kontaktformular

**Datum:** Juni 2026

---

## Zusammenfassung

Vollständiges Support-System mit Kontaktformular, E-Mail-Versand (Resend/SMTP), Admin-Verwaltung und Mobile-First UI.

- `npm run build` — erfolgreich
- `npm run lint` — nur bestehende Warnungen

---

## Support Workflow

```
Nutzer → Einstellungen → Support
       → Schnellauswahl (Kategorie)
       → Formular ausfüllen
       → POST /api/support
       → DB: SupportRequest (Status: OPEN)
       → E-Mail an SUPPORT_EMAIL
       → Bestätigungs-E-Mail an Nutzer
       → Erfolgsmeldung (grün)

Admin → /admin → Support-Anfragen
      → Filter: Offen / In Bearbeitung / Erledigt
      → Suche nach Name, E-Mail, Nachricht
      → Status ändern per Klick
```

---

## Environment Variablen

| Variable | Pflicht | Beschreibung |
|----------|---------|--------------|
| `SUPPORT_EMAIL` | Ja (für Versand) | Empfänger aller Support-Anfragen, z.B. `meine@email.at` |
| `RESEND_API_KEY` | Ja* | Resend API Key |
| `EMAIL_FROM` | Nein | Absender, z.B. `NEXFORM <support@deinedomain.com>` |
| `APP_NAME` | Nein | Name in Bestätigungs-E-Mail (Default: `NEXFORM`) |
| `SMTP_HOST` | Alternative | SMTP statt Resend |

\* Oder SMTP-Konfiguration (`SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`)

### Beispiel `.env`

```env
SUPPORT_EMAIL=meine@email.at
RESEND_API_KEY=re_xxxxxxxx
EMAIL_FROM=NEXFORM <onboarding@resend.dev>
APP_NAME=NEXFORM
```

Empfänger ändern: nur `SUPPORT_EMAIL` anpassen — **kein Code-Change nötig**.

---

## API Endpoints

| Methode | Route | Auth | Beschreibung |
|---------|-------|------|--------------|
| `POST` | `/api/support` | Optional (User-ID wenn eingeloggt) | Anfrage senden |
| `GET` | `/api/admin/support` | Admin | Liste + Status-Counts, `?status=&q=` |
| `PATCH` | `/api/admin/support?id=` | Admin | Status aktualisieren |

### POST /api/support Body

```json
{
  "name": "Max Mustermann",
  "email": "max@example.com",
  "category": "FEATURE",
  "message": "Bitte Dark Mode für Charts…",
  "website": ""
}
```

---

## E-Mail Templates

### An Support-Team
- **Betreff:** `[Fitness App Support] Neue Anfrage`
- **Inhalt:** Name, E-Mail, Kategorie, Nachricht, Datum, User-ID

### Bestätigung an Nutzer
- **Betreff:** `Wir haben deine Anfrage erhalten`
- **Inhalt:** Personalisierte Bestätigung mit Kategorie + 24h-Hinweis + APP_NAME Support Team

Implementierung: `src/lib/support-email.ts`

---

## Kategorien

| Wert | Label |
|------|-------|
| `PROBLEM` | Problem melden |
| `IMPROVEMENT` | Verbesserungsvorschlag |
| `FEATURE` | Feature-Wunsch |
| `BUG` | Fehler melden |
| `ACCOUNT` | Account Problem |
| `OTHER` | Sonstiges |

---

## Sicherheit

| Maßnahme | Details |
|----------|---------|
| Rate Limiting | 5 Anfragen / Stunde pro User oder IP |
| Honeypot | Verstecktes `website`-Feld — Bots erhalten Fake-Erfolg |
| Server-Validierung | Zod Schema (`supportRequestSchema`) |
| XSS | HTML-Escape in E-Mails |
| Rollback | DB-Eintrag wird gelöscht wenn E-Mail fehlschlägt |

---

## Neue Dateien

| Datei | Zweck |
|-------|-------|
| `prisma/migrations/20250607120000_support_requests/migration.sql` | DB Migration |
| `src/lib/support-config.ts` | Kategorien, APP_NAME, SUPPORT_EMAIL |
| `src/lib/support-email.ts` | E-Mail-Versand + Templates |
| `src/app/api/support/route.ts` | Public API |
| `src/app/api/admin/support/route.ts` | Admin API |
| `src/app/(app)/settings/support/page.tsx` | Support-Seite |
| `src/app/(app)/settings/support/layout.tsx` | SEO Metadata |
| `src/components/admin/admin-support-panel.tsx` | Admin UI |

## Geänderte Dateien

| Datei | Änderung |
|-------|----------|
| `prisma/schema.prisma` | `SupportRequest`, Enums |
| `src/lib/validations.ts` | `supportRequestSchema` |
| `src/app/(app)/settings/page.tsx` | Support-Menüpunkt |
| `src/app/(app)/admin/page.tsx` | Support-Panel |

---

## Datenbank

```sql
-- Migration ausführen:
npx prisma migrate deploy
```

Model `SupportRequest`:
- `status`: OPEN | IN_PROGRESS | RESOLVED
- `category`: SupportCategory enum
- `userId`: optional (eingeloggte Nutzer)

---

## UI

### Support-Seite (`/settings/support`)
- Mobile-First, max-width 430px
- 5 Schnellauswahl-Karten
- Formular mit Pflichtfeldern
- Grüne Erfolgsmeldung nach Versand
- Profil-Name/E-Mail vorausgefüllt

### Einstellungen
- Neuer Menüpunkt **Support** mit LifeBuoy-Icon

### Admin
- Tabs: Alle / Offen / In Bearbeitung / Erledigt
- Suchfeld
- Status-Buttons pro Anfrage

---

## Migration ausführen

```bash
npx prisma migrate deploy
```

Bei lokaler Entwicklung:
```bash
npx prisma db push
```
