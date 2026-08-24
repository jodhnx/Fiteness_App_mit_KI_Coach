# AI Fitness Coach Pro

HTL-Diplomarbeit: Moderne SaaS-Fitness-Webanwendung mit KI-Coach, Training, Ernährung, Vitaldaten, Gamification und Admin-Panel.

## Tech Stack

- **Frontend:** Next.js 15, React, TypeScript, Tailwind CSS, Shadcn-Style UI
- **Backend:** Next.js API Routes
- **Datenbank:** PostgreSQL + Prisma ORM
- **Auth:** NextAuth (Credentials + Google)
- **KI:** OpenAI API (GPT-4o-mini)
- **Charts:** Recharts
- **Deployment:** Docker, Vercel-ready

## Schnellstart

### 1. PostgreSQL starten

**Ohne Docker (Windows):**

```bash
npm run db:start   # Prisma Dev Server
npm run db:setup   # Tabellen + Test-Admin + .env URL
```

**Mit Docker:**

```bash
docker compose up -d
npm run db:migrate:deploy && npm run db:seed
```

**Diagnose:** `npm run db:diagnose` · **Health:** `GET /api/health`

### 2. Umgebungsvariablen

Kopiere `.env.example` nach `.env` und setze mindestens:

- `DATABASE_URL`
- `AUTH_SECRET` (min. 32 Zeichen)
- **E-Mail:** `RESEND_API_KEY` + `EMAIL_FROM` **oder** SMTP (`SMTP_HOST`, `SMTP_USER`, `SMTP_PASS`)
- `OPENAI_API_KEY` (für KI Coach & Bildanalyse)

### Registrierung mit E-Mail-Bestätigung

1. `/register` → Konto anlegen (6-stelliger Code per E-Mail)
2. `/verify-email` → Code eingeben
3. `/login` → Anmeldung → `/dashboard`

Nicht verifizierte Konten erhalten beim Login: *„Bitte bestätige zuerst deine E-Mail-Adresse.“*

### 3. Datenbank & Seed

```bash
npm install
npm run db:migrate:deploy
npm run db:seed
```

### 4. Entwicklungsserver

```bash
npm run dev
```

Öffne [http://localhost:3000](http://localhost:3000)

### Demo-Admin

- E-Mail: `admin@aifitness.local`
- Passwort: `Admin123!`

## Features

| Bereich | Funktionen |
|---------|------------|
| Auth | Login, Registrierung, Passwort-Reset, Google OAuth |
| Dashboard | Tages/Wochen/Monatsübersicht, BMI, Charts |
| Training | PPL, Upper/Lower, Ganzkörper, Session-Logging |
| Ernährung | Kalorien/Makro-Rechner, Mahlzeiten, Lebensmittel-DB |
| KI Coach | Chat, Trainings-/Ernährungspläne, Analyse |
| Fortschritt | Gewicht, Maße, Fotos mit KI-Analyse |
| Gamification | XP, Level, Badges, Challenges, Leaderboard, Streak |
| Social | Freunde, Anfragen, Rankings |
| Wearables | API für Fitbit, Garmin, Apple Health, Samsung |
| Admin | Nutzer, Logs, KI-Nutzung, Fehlerberichte |

## Sicherheit

- JWT Sessions (NextAuth)
- Rate Limiting auf sensiblen APIs
- Zod Input Validation
- Prisma (SQL Injection Schutz)
- Security Headers (Middleware)
- CSRF via NextAuth

## Produktion

```bash
npm run build
npm start
```

Vercel: `DATABASE_URL`, `AUTH_SECRET`, `OPENAI_API_KEY`, `AUTH_GOOGLE_*` als Environment Variables setzen.

## Projektstruktur

```
src/
  app/           # Pages & API Routes
  components/    # UI, Layout, Charts
  lib/           # Auth, Prisma, KI, Gamification
  generated/     # Prisma Client
prisma/          # Schema & Seed
```

## Lizenz

HTL-Diplomarbeit – Bildungsprojekt.
