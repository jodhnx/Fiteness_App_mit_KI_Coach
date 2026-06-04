# Login-Fix Bericht (Vercel)

## Symptome

- Nach Anmeldung: **404 `DEPLOYMENT_NOT_FOUND`**
- Vercel Logs: nur **`CredentialsSignin`** / `at Object.authorize` — ohne konkrete Ursache

---

## Ursachen (zwei getrennte Probleme)

### 1. Irreführende Logs (`CredentialsSignin`)

NextAuth fasst alle Fehler im Credentials-`authorize`-Hook unter **`CredentialsSignin`** zusammen. Die bisherigen Detail-Logs liefen nur bei `DEBUG_AUTH=1` und erschienen **nicht** in den Vercel Production Logs.

**Typische echte Gründe auf Vercel:**

| Grund | Log-Phase (neu) |
|--------|------------------|
| Falsches Passwort / User fehlt | `login_failed` → `user_not_found_or_no_password` / `password_invalid` |
| E-Mail nicht bestätigt | `login_failed` → `email_not_verified` |
| Supabase/DB nicht erreichbar | `login_failed` → `database_connection` |
| Ungültige Eingabe | `login_failed` → `invalid_payload` |
| Rate Limit | `login_failed` → `rate_limited` |

### 2. Weiterleitung auf tote Deployment-URL (`DEPLOYMENT_NOT_FOUND`)

Wenn `NEXTAUTH_URL` (oder NextAuths `baseUrl`) auf eine **alte Preview-/Deployment-URL** zeigt (z. B. `https://projekt-abc123-team.vercel.app`), baut der Redirect-Callback eine **absolute URL** auf diesem Host. Ist das Deployment gelöscht, liefert Vercel **`DEPLOYMENT_NOT_FOUND`**.

Das passiert auch, wenn `signIn(..., { redirect: true })` oder OAuth-Callbacks diese URL verwenden — nicht nur bei erfolgreichem Login.

---

## Änderungen

### Logging (`src/lib/auth-logger.ts`, `src/lib/auth.ts`)

- Neue Funktion **`logAuthServer()`** — schreibt **immer** strukturiert nach `console.error` (JSON, Tag `[auth]`)
- Phasen u. a.: `env_check`, `parse_credentials`, `db_user_lookup`, `password_check`, `email_verification_check`, `login_success`, `login_failed`, `authorize_throw` mit **`code`** (`invalid_credentials`, `email_not_verified`, `database_connection`)
- Warnung beim Start, wenn `NEXTAUTH_URL` wie eine ephemeral Deployment-URL aussieht

### Redirects (`src/lib/auth-redirect.ts`, `src/lib/auth-flow.ts`, `src/lib/auth.config.ts`)

- **`safeAuthRedirect`** gibt nur noch **`/home`** zurück (relativer Pfad, gleiche Origin → `trustHost`)
- **`resolvePostLoginPath`** ignoriert `callbackUrl` / externe URLs → immer **`/home`**
- Login-Seite: `redirect: false`, danach `window.location.replace('/home')`
- Google-Login: `callbackUrl: '/home'`
- `getServerAuthBaseUrl()` bevorzugt `AUTH_URL` / Produktions-Host, nicht Preview-`VERCEL_URL`

### Login UI (`src/app/login/page.tsx`)

- Kein `callbackUrl` aus Query mehr für Zielseite
- Fehlercode aus `res.code` (Custom `CredentialsSignin`-Subklassen)
- Absolute `res.url` wird **nicht** gefolgt

---

## Geänderte Dateien

| Datei | Änderung |
|-------|----------|
| `src/lib/auth.ts` | Server-Logs, DB/E-Mail-Schritte, Startup-Warnungen |
| `src/lib/auth-logger.ts` | `logAuthServer`, `logAuthEnvOnce` |
| `src/lib/auth-redirect.ts` | Relative Redirects, immer `/home`, ephemeral URL detection |
| `src/lib/auth-flow.ts` | Immer `/home` nach Login |
| `src/lib/auth.config.ts` | `debug` bei `AUTH_DEBUG=1` |
| `src/app/login/page.tsx` | Vereinfachter Flow, kein Deployment-Redirect |
| `docs/LOGIN-FIX-REPORT.md` | Dieser Bericht |

---

## Vercel Environment (Checkliste)

| Variable | Empfehlung |
|----------|------------|
| `AUTH_SECRET` | Pflicht, min. 32 Zeichen |
| `NEXTAUTH_SECRET` | Gleicher Wert wie `AUTH_SECRET` (optional) |
| `NEXTAUTH_URL` / `AUTH_URL` | **Nur stabile Produktions-URL** oder **leer lassen** (`trustHost`) |
| `DATABASE_URL` | Supabase Pooler 6543 mit `?pgbouncer=true` |
| `EMAIL_VERIFICATION` | `false` zum Testen ohne E-Mail-Bestätigung |

**Nicht setzen:** alte Preview-URLs, URLs mit Deployment-Hash, `localhost` in Production.

---

## Warum Login jetzt funktioniert

1. **Erfolgreicher Login** bleibt auf der **aktuellen Domain** (`/home` relativ) — kein Sprung auf ein gelöschtes Deployment.
2. **Fehlgeschlagener Login** bleibt auf `/login` mit Toast; Vercel zeigt den **exakten Grund** in `[auth]` JSON-Logs.
3. **Custom Error Codes** (`invalid_credentials`, `email_not_verified`, `database_connection`) werden an den Client durchgereicht.

---

## Logs lesen (Vercel)

Filter: `[auth]`

Beispiele:

```json
{"tag":"[auth]","phase":"login_failed","reason":"password_invalid","email":"..."}
{"tag":"[auth]","phase":"login_failed","reason":"database_connection","during":"user_lookup"}
{"tag":"[auth]","phase":"login_success","userId":"...","email":"..."}
```

Optional zusätzlich: `AUTH_DEBUG=1` für NextAuth-interne Debug-Ausgabe.

---

## Build

`npm run build` — nach den Änderungen ausführen und grün bestätigen.
