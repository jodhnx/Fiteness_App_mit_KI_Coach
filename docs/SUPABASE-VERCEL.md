# Supabase + Vercel Environment Variables

## Prisma 7

In **Prisma 7** liegt die CLI-Datenbank-URL in `prisma.config.ts` (`datasource.url`).  
`schema.prisma` enthält **keinen** `url`-Eintrag.

- **CLI** (`prisma migrate`, `studio`): bevorzugt `DIRECT_URL` (Port **5432**, Session oder Direct)
- **Runtime** (`src/lib/prisma.ts` + `@prisma/adapter-pg`): `DATABASE_URL` (Port **6543**, Transaction Pooler, `?pgbouncer=true`)

```ts
// prisma.config.ts — nur CLI
datasource: {
  url: DIRECT_URL ?? DATABASE_URL
}
```

---

## Supabase Dashboard → Connect

1. **Transaction pooler** (Port **6543**, Mode: Transaction) → `DATABASE_URL`  
   Anhängen: `?pgbouncer=true&connection_limit=1`
2. **Session pooler** oder **Direct connection** (Port **5432**) → `DIRECT_URL`

Format (Passwort URL-encoded; `PROJECT_REF` aus dem aktuellen Dashboard):

```text
DATABASE_URL=postgresql://postgres.PROJECT_REF:PASSWORD@aws-REGION.pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1
DIRECT_URL=postgresql://postgres.PROJECT_REF:PASSWORD@aws-REGION.pooler.supabase.com:5432/postgres
```

User muss `postgres.<project-ref>` sein. Host ist der Pooler — **nicht** `postgres.PROJECT_REF` als Hostname.

Wenn der Pooler meldet `tenant/user postgres.… not found`, existiert das Projekt nicht mehr, ist pausiert oder die Ref/Credentials sind veraltet. Dann neue URLs aus dem Dashboard kopieren und in Vercel + lokaler `.env` ersetzen.

---

## Vercel → Settings → Environment Variables

| Variable | Pflicht | Beschreibung |
|----------|---------|--------------|
| `DATABASE_URL` | Ja | Transaction pooler **6543** + `pgbouncer=true` — **Runtime / Login** |
| `DIRECT_URL` | Empfohlen | Session/Direct **5432** — nur Prisma CLI. Ungültiges `DIRECT_URL` blockiert Login **nicht** mehr. |
| `AUTH_SECRET` | Ja | Min. 32 Zeichen |
| `NEXTAUTH_SECRET` | Ja | Gleich wie `AUTH_SECRET` oder eigener Wert |
| `NEXTAUTH_URL` / `AUTH_URL` | Empfohlen | Feste Produktions-Domain |
| `OPENAI_API_KEY` | Optional | KI Coach |
| `AUTH_GOOGLE_ID` / `AUTH_GOOGLE_SECRET` | Optional | Google OAuth |
| `RESEND_API_KEY` / `EMAIL_FROM` | Optional | E-Mail |

**Build:** `vercel-build` = `prisma generate && next build`  
→ **kein** `migrate deploy` im Production-Build (keine Schema-/Datenänderung beim Deploy).

Manuelle Migrationen nur bewusst lokal/CI:

```bash
npm run db:migrate:deploy
```

**Nicht setzen:** localhost-URLs, Platzhalter-Passwörter, URLs eines gelöschten/pausierten Projekts.

---

## Checkliste nach Credential-Update

1. Supabase-Projekt aktiv (nicht paused)
2. Vercel `DATABASE_URL` + `DIRECT_URL` aus frischem „Connect“-Dialog
3. Redeploy ohne Cache
4. Lokal: `npm run db:test-connection` (Read-only)
