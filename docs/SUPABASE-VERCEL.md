# Supabase + Vercel Environment Variables

Projekt-Referenz: **hdvitxmxrpsjfgsdbfst**

## Prisma 7 Hinweis

In **Prisma 7** gibt es in `prisma.config.ts` nur noch **`datasource.url`** (kein `directUrl`).  
`db push` / `migrate` würden sonst den Transaction-Pooler (6543) nutzen → Fehler *prepared statement "s1" already exists*.

```ts
// prisma.config.ts — nur CLI (Migrationen, db push, studio)
datasource: {
  url: process.env["DIRECT_URL"], // Port 5432 (Session oder Direct)
}
```

```prisma
// prisma/schema.prisma
datasource db {
  provider = "postgresql"
}
```

Die App nutzt `@prisma/adapter-pg` mit **`DATABASE_URL`** (6543, `?pgbouncer=true`) — siehe `src/lib/prisma.ts`.

---

## Supabase Dashboard → Settings → Database

1. **Transaction pooler** (Port **6543**, Mode: Transaction) → `DATABASE_URL`
2. **Session pooler** or **Direct** (Port **5432**) → `DIRECT_URL`

Format (Passwort aus dem Dashboard, URL-encoded):

```
DATABASE_URL=postgresql://postgres.hdvitxmxrpsjfgsdbfst:DEIN_DB_PASSWORT@aws-1-eu-west-2.pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1
DIRECT_URL=postgresql://postgres.hdvitxmxrpsjfgsdbfst:DEIN_DB_PASSWORT@aws-1-eu-west-2.pooler.supabase.com:5432/postgres
```

Der Benutzername ist **`postgres.hdvitxmxrpsjfgsdbfst`** (nicht `postgres.[irgendwas]`).

---

## Vercel → Project → Settings → Environment Variables

| Variable | Pflicht | Beschreibung |
|----------|---------|--------------|
| `DATABASE_URL` | Ja | Supabase **Transaction pooler** (6543), `?pgbouncer=true&connection_limit=1` |
| `DIRECT_URL` | Ja | Supabase **Direct/Session** (5432) — für `prisma db push` in CI optional |
| `NEXT_PUBLIC_SUPABASE_URL` | Optional | `https://hdvitxmxrpsjfgsdbfst.supabase.co` |
| `AUTH_SECRET` | Ja | Min. 32 Zeichen Zufallsstring |
| `NEXTAUTH_SECRET` | Ja | Gleich wie `AUTH_SECRET` oder eigener Wert |
| `NEXTAUTH_URL` | Ja | Production-URL, z. B. `https://deine-app.vercel.app` |
| `EMAIL_VERIFICATION` | Empfohlen | `false` zum Testen, `true` in Production |
| `RESEND_API_KEY` | Wenn E-Mail | Resend API Key |
| `EMAIL_FROM` | Wenn E-Mail | Absender-Adresse |
| `AUTH_GOOGLE_ID` | Optional | Google OAuth |
| `AUTH_GOOGLE_SECRET` | Optional | Google OAuth |
| `OPENAI_API_KEY` | Optional | KI Coach |

**Nicht setzen:** `localhost`-Datenbank-URLs, Prisma-Dev-Ports `51218`/`51219`, unersetzte Connection-String-Platzhalter.

---

## Ersteinrichtung (lokal, einmalig)

```bash
npm run db:supabase:setup
npm run db:verify-supabase
npm run auth:test
npm run dev
```

## Demo-Admin (nach Seed)

- E-Mail: `admin@aifitness.local`
- Passwort: `Admin123!`
