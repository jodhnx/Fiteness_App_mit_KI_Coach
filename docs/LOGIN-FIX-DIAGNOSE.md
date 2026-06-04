# Login-Fix: „Anmeldung fehlgeschlagen. Bitte erneut versuchen.“

## Ursache (Hauptfehler)

Der Login war auf dem Server **oft erfolgreich**, scheiterte aber danach im **Browser**:

1. `safeAuthRedirect` lieferte nur den relativen Pfad `/home`.
2. NextAuth v5 `signIn()` parst die Antwort mit `new URL(data.url)` **ohne Basis-URL**.
3. Bei `/home` → **`TypeError: Invalid URL`** → `catch` in der Login-Seite → generische Meldung:
   *„Anmeldung fehlgeschlagen. Bitte erneut versuchen.“*

Das war **kein** Passwort- und **kein** DB-Problem, sondern ein **Client-Bug** nach erfolgreicher Authentifizierung.

## Antworten auf die 10 Prüfpunkte

| # | Prüfung | Ergebnis |
|---|---------|----------|
| 1 | User in DB? | Wird geloggt: `USER FOUND` mit `id`, `email` oder `null` |
| 2 | passwordHash? | `hasPasswordHash: true` oder Login failed `user_not_found_or_no_password` |
| 3 | Passwort-Hash korrekt? | Registrierung nutzt `bcrypt.hash(..., 12)` — gleich wie Admin/Reset |
| 4 | emailVerified? | `EMAIL VERIFIED` + Log `email_verification_check` |
| 5 | InvalidCredentialsError? | Bei falschem User/Passwort — Code `invalid_credentials` |
| 6 | UnverifiedEmailError? | Wenn `EMAIL_VERIFICATION` aktiv und nicht verifiziert — Code `email_not_verified` |
| 7 | DatabaseConnectionError? | Bei DB-Ausfall — Code `database_connection` |
| 8 | prisma.user.findUnique? | Über `dbQuery("auth.user.findUnique")` + Logs |
| 9 | Session erstellt? | Nach Fix: JWT-Callback mit schlankem Token |
| 10 | Cookies gesetzt? | Cookie `authjs.session-token.v2` nach erfolgreichem Callback |

## Änderungen

### `src/lib/auth-flow.ts`

- Neue Funktion **`signInCredentials()`** — ersetzt `signIn("credentials")` für E-Mail-Login.
- Parst Redirect-URLs relativ mit `window.location.origin` (kein `Invalid URL`).

### `src/lib/auth-redirect.ts`

- `safeAuthRedirect` liefert **`https://<aktueller-host>/home`** via `trustHost` + `baseUrl` (für NextAuth-Client kompatibel).

### `src/lib/auth.ts`

- Debug-Logs: `USER FOUND`, `PASSWORD VALID`, `EMAIL VERIFIED`, `LOGIN ERROR`.
- Strukturierte Logs weiterhin über `logAuthServer` für Vercel.

### `src/lib/auth-jwt.ts`

- JWT-Callback bricht Login nicht mehr ab, wenn Onboarding-DB-Lookup fehlschlägt.

### `src/app/login/page.tsx`

- Nutzt `signInCredentials`.
- Zeigt **konkreten Fehlertext** (und bei `NEXT_PUBLIC_DEBUG_AUTH=1` Code + HTTP-Status).

## Vercel Logs lesen

Filter: `[auth]` oder:

```
USER FOUND
PASSWORD VALID
EMAIL VERIFIED
LOGIN ERROR
```

JSON-Logs: `"phase":"login_success"` / `"reason":"password_invalid"` / `"reason":"email_not_verified"`.

## Browser

- Konsole (F12): `[auth-flow] signIn_result`, `LOGIN ERROR` nur bei echtem Fehler.
- Auf der Login-Karte: roter Hinweistext mit genauer Meldung.

## Env-Hinweise

| Variable | Wirkung |
|----------|---------|
| `EMAIL_VERIFICATION=false` | Login ohne E-Mail-Bestätigung (Test) |
| `AUTH_SECRET` | Pflicht für Session-Cookie |
| `DATABASE_URL` | Supabase 6543 + `?pgbouncer=true` |
| `NEXT_PUBLIC_DEBUG_AUTH=1` | Detaillierte Fehler in der UI |

## Nach Deploy testen

1. Cookies löschen (alte große Cookies).
2. Login mit bekanntem User.
3. Erwartung: Weiterleitung nach `/home`, kein generischer Catch-Fehler.

Demo-Admin (nach `npm run db:seed` / `auth:test`):

- `admin@aifitness.local` / `Admin123!`
