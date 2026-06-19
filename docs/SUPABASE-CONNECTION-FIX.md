# Supabase / Registrierung — Diagnose & Fix

## Ursache

Die **Connection URLs in `.env` sind formal korrekt formatiert**, aber das Supabase-Projekt **`hdvitxmxrpsjfgsdbfst` existiert nicht mehr**:

| Prüfung | Ergebnis |
|---------|----------|
| URL-Parsing | Host: `aws-1-eu-west-2.pooler.supabase.com`, User: `postgres.hdvitxmxrpsjfgsdbfst`, Port: 6543 ✓ |
| DNS `db.hdvitxmxrpsjfgsdbfst.supabase.co` | **NXDOMAIN** (Domain existiert nicht) |
| DNS `hdvitxmxrpsjfgsdbfst.supabase.co` | **NXDOMAIN** |
| Pooler-Fehler | `(ENOTFOUND) tenant/user postgres.hdvitxmxrpsjfgsdbfst not found` |

Der Fehler **ist kein Code-Bug** und **kein falscher Hostname in der URL** (der Host ist korrekt der Pooler, nicht `postgres.hdvitxmxrpsjfgsdbfst`).

Der Supabase-Pooler antwortet: **Tenant/User unbekannt** — typisch wenn das Projekt **gelöscht, pausiert oder die Referenz veraltet** ist.

## Was geändert wurde (Code)

| Datei | Änderung |
|-------|----------|
| `src/lib/database-url.ts` | **Neu** — URL-Validierung, Host-vs-User-Prüfung, Pooler-Fehler-Diagnose |
| `src/lib/prisma.ts` | Nutzt zentrale Validierung |
| `src/lib/format-api-error.ts` | Spezifische Supabase-Fehlermeldungen |
| `src/lib/register-service.ts` | Registrierung zeigt echte DB-Ursache |
| `prisma.config.ts` | Validiert `DIRECT_URL` vor CLI |
| `scripts/test-prisma-connection.ts` | **Neu** — `npm run db:test-connection` |
| `scripts/verify-supabase.ts` | Nutzt neue Validierung |
| `scripts/setup-supabase.ts` | Nutzt neue Validierung |
| `.env.example` | Klarstellung: User ≠ Host |

## Finale DATABASE_URL (aus .env, maskiert)

```
postgresql://postgres.hdvitxmxrpsjfgsdbfst:****@aws-1-eu-west-2.pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1
```

## Prisma-Verbindung

```
✗ prisma.user.count() — FEHLGESCHLAGEN
Diagnose: Supabase-Projekt „hdvitxmxrpsjfgsdbfst" existiert nicht oder ist pausiert/gelöscht.
```

## Was du tun musst

1. [Supabase Dashboard](https://supabase.com/dashboard) öffnen
2. Projekt **wiederherstellen/reaktivieren** ODER **neues Projekt** anlegen
3. **Connect → ORM → Prisma** — beide URLs kopieren:
   - **Transaction pooler (6543)** → `DATABASE_URL` mit `?pgbouncer=true`
   - **Session/Direct (5432)** → `DIRECT_URL`
4. `.env` aktualisieren
5. Verifizieren:

```bash
npm run db:test-connection
npm run db:verify-supabase
npx prisma db push
npm run auth:test
```

### Optional: Lokale Entwicklung (Docker)

```bash
docker compose up -d
```

`.env`:
```env
ALLOW_LOCAL_DATABASE=true
DATABASE_URL=postgresql://fitness:fitness_secret@localhost:5432/ai_fitness_coach
DIRECT_URL=postgresql://fitness:fitness_secret@localhost:5432/ai_fitness_coach
```

## Tests (Stand)

| Test | Status |
|------|--------|
| `npm run db:test-connection` | ✗ Projekt nicht erreichbar (klare Diagnose) |
| `npm run db:verify-supabase` | ✗ Ping fehlgeschlagen |
| Registrierung / Login | ✗ blockiert durch DB |
| Support / Ernährung / Übungen | ✗ blockiert durch DB |
| `npm run build` | ✓ erfolgreich |

Nach gültigen Supabase-URLs funktionieren Registrierung und alle DB-Tests.
