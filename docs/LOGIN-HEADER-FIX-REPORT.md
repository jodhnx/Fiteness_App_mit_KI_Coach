# Login-Fix: REQUEST_HEADER_TOO_LARGE (494)

## Symptom

- Vercel: **494 REQUEST_HEADER_TOO_LARGE**
- Login schlägt fehl oder Requests brechen nach Anmeldung ab

## Ursache

Die Session wurde als **JWT im Cookie** gespeichert. Der Token war **viel zu groß** für Vercels Header-Limit (~8–16 KB gesamt):

1. **Profilbild als Data-URL in der DB** (bis ~200 KB) wurde über `authorize()` als `image` in den User geschrieben und von NextAuth ins JWT übernommen.
2. **`updateSession({ user: { image: dataUrl } })`** in Einstellungen/Profil schrieb das Bild **erneut** in den JWT (kritischster Auslöser nach Avatar-Upload).
3. Der **JWT-Callback** lud bei **jedem Request** Profil-Daten und ließ Standardfelder (`name`, `picture`, …) im Token wachsen.
4. Auth.js **splittet** große Cookies in mehrere Chunks → Summe aller `Cookie`-Header > Limit → **494**.

Das ist **kein** klassischer Redirect-Loop, sondern ein **Cookie-Größen**-Problem. Redirects (`callbackUrl`, alte Deployment-URLs) waren ein separates, bereits behobenes Thema.

## Lösung

### Minimales JWT (`src/lib/auth-jwt.ts`)

Nur noch:

- `id` / `sub`
- `email`
- `role`
- `onboardingComplete`

Kein `name`, kein `image`, kein Profil, keine Arrays.

### Neuer Cookie-Name (`auth.config.ts`)

`authjs.session-token.v2` / `__Secure-authjs.session-token.v2` — alte, übergroße Cookies werden ungültig (Nutzer einmal neu anmelden).

### Session-Callback

Liefert nur die vier schlanken `session.user`-Felder.

### Kein `updateSession` für Bilder

Profilbild nur noch über `/api/profile` + `useProfileHeader()` im Header — **nicht** in der Session.

### Middleware

Redirect zu `/login` **ohne** `callbackUrl` (kürzere URLs, kein Schleifen-Risiko).

### Login / Logout

- Login → `/home` (unverändert, relativ)
- Logout in Einstellungen → `signOut({ callbackUrl: "/login" })`

## Geänderte Dateien

| Datei | Änderung |
|-------|----------|
| `src/lib/auth-jwt.ts` | **Neu** — schlanker JWT + Session |
| `src/lib/auth.config.ts` | JWT/Session-Callbacks, Cookie v2, Session maxAge |
| `src/lib/auth.ts` | `authorize` ohne name/image; keine doppelten JWT-Callbacks |
| `src/types/next-auth.d.ts` | Schlanke Session-Typen |
| `src/middleware.ts` | Login ohne callbackUrl |
| `src/hooks/use-profile-header.ts` | **Neu** — Avatar aus API |
| `src/components/layout/app-shell.tsx` | Header über Profile-API |
| `src/app/(app)/settings/page.tsx` | Kein `updateSession`; Abmelden-Button |
| `src/app/(app)/profile/page.tsx` | Kein `updateSession` für Bild |
| `docs/LOGIN-HEADER-FIX-REPORT.md` | Dieser Bericht |

## Warum Login vorher kaputt war

Nach Avatar-Upload oder Login mit User, der ein Data-URL-Bild hatte, wuchs das Session-Cookie auf **Hunderttausende Zeichen**. Jeder Request (inkl. Middleware) schickte diese Header → Vercel **494** → Login/Navigation wirkte „kaputt“.

## Warum Login jetzt funktioniert

- JWT typisch **< 500 Bytes**
- Ein Cookie, kein Chunking
- Header unter Vercel-Limit
- Profilbild separat aus der DB/API

## Nach Deploy

1. Redeploy auf Vercel
2. Im Browser **Cookies für die App löschen** (oder einmal abmelden mit neuem Build)
3. Neu anmelden → `/home`

## Vercel Env (unverändert wichtig)

- `AUTH_SECRET` / `NEXTAUTH_SECRET`
- `DATABASE_URL` mit `?pgbouncer=true`
- `NEXTAUTH_URL` nur Produktions-Domain oder leer (`trustHost`)
