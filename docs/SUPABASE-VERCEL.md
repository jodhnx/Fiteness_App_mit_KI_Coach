# Supabase + Vercel Environment Variables

## Prisma 7 + `@prisma/adapter-pg` (wichtig)

In **Prisma 7** liegt die CLI-Datenbank-URL in `prisma.config.ts` (`datasource.url`).  
`schema.prisma` enthält **keinen** `url`-Eintrag.

| Nutzung | Variable | Port | Warum |
|---------|----------|------|--------|
| **Runtime** (Login, Prisma Client, `@prisma/adapter-pg`) | bevorzugt `DIRECT_URL`, sonst `DATABASE_URL` | **5432** Session/Direct | Node-`pg`-Adapter ignoriert `?pgbouncer=true`. Transaction-Pooler **:6543** bricht Prepared Statements → Login-Fehler. |
| **CLI** (`prisma migrate`, `studio`) | `DIRECT_URL` (Fallback `DATABASE_URL`) | **5432** | Migrationen brauchen Session/Direct |

`src/lib/database-url.ts` → `getRuntimeDatabaseUrl()` wählt automatisch die **:5432**-URL, wenn `DIRECT_URL` gültig ist — auch wenn `DATABASE_URL` noch auf Transaction **:6543** steht.

```ts
// prisma.config.ts — nur CLI
datasource: {
  url: DIRECT_URL ?? DATABASE_URL
}
```

---

## Supabase Dashboard → Connect

1. **Session pooler** oder **Direct connection** (Port **5432**) → `DIRECT_URL` (**Pflicht für zuverlässigen Login**)
2. Optional: **Transaction pooler** (Port **6543**, Mode: Transaction) → `DATABASE_URL`  
   Anhängen: `?pgbouncer=true&connection_limit=1`  
   (wird von der Runtime nur genutzt, wenn keine gültige :5432-URL vorhanden ist — **nicht empfohlen**)

**Empfohlen für Vercel:**

```text
# Runtime + CLI (Session)
DIRECT_URL=postgresql://postgres.PROJECT_REF:PASSWORD@aws-REGION.pooler.supabase.com:5432/postgres

# Optional / Legacy-Name (Transaction) — Runtime nutzt trotzdem DIRECT_URL :5432
DATABASE_URL=postgresql://postgres.PROJECT_REF:PASSWORD@aws-REGION.pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1
```

Oder beide auf Session setzen:

```text
DATABASE_URL=postgresql://postgres.PROJECT_REF:PASSWORD@aws-REGION.pooler.supabase.com:5432/postgres
DIRECT_URL=postgresql://postgres.PROJECT_REF:PASSWORD@aws-REGION.pooler.supabase.com:5432/postgres
```

User muss `postgres.<project-ref>` sein (Pooler). Host ist der Pooler — **nicht** `postgres.PROJECT_REF` als Hostname.

Wenn der Pooler meldet `tenant/user postgres.… not found`, existiert das Projekt nicht mehr, ist pausiert oder die Ref/Credentials sind veraltet.

**Passwort-Sonderzeichen:** `#` in der URL als `%23`, `@` als `%40`, etc. encoden. Die Runtime nutzt diskrete `pg`-Felder (entschärft Encoding-Fallen).

---

## Vercel → Settings → Environment Variables

| Variable | Pflicht | Beschreibung |
|----------|---------|--------------|
| `DATABASE_URL` | Ja | Mindestens gültige Pooler-URL; für PrismaPg besser ebenfalls **5432** |
| `DIRECT_URL` | **Stark empfohlen** | Session/Direct **5432** — Runtime-Login bevorzugt diese URL |
| `AUTH_SECRET` | Ja | Min. 32 Zeichen |
| `NEXTAUTH_SECRET` | Ja | Gleich wie `AUTH_SECRET` oder eigener Wert |
| `NEXTAUTH_URL` / `AUTH_URL` | Empfohlen | Feste Produktions-Domain |
| `OPENAI_API_KEY` | Optional | KI Coach |
| `AUTH_GOOGLE_ID` / `AUTH_GOOGLE_SECRET` | Optional | Google OAuth |
| `RESEND_API_KEY` / `EMAIL_FROM` | Optional | E-Mail |

**Build:** `vercel-build` = `prisma generate && next build`  
→ **kein** `migrate deploy` im Production-Build.

Ungültiges `DIRECT_URL` blockiert Login **nicht** mehr — Runtime fällt dann auf `DATABASE_URL` zurück (bei :6543 riskant für PrismaPg).

---

## Symptom „Anmeldung vorübergehend nicht möglich“

Oft: Runtime hing an Transaction **:6543** → Prepared-Statement-/Driver-Fehler → `DatabaseConnectionError`.

Fix: `DIRECT_URL` auf Session **:5432** setzen und neu deployen. Health: `GET /api/health` → `connection.runtimePort` sollte `"5432"` sein.

---

## Checkliste nach Credential-Update

1. Supabase-Projekt aktiv (nicht paused)
2. Vercel `DIRECT_URL` = Session **5432** (und `DATABASE_URL` gesetzt)
3. Redeploy ohne Cache
4. `/api/health` → `ok: true`, `prisma: "ok"`, `runtimePort: "5432"`
5. Lokal: `npm run db:test-connection` (Read-only)
