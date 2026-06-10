# Support-System Fix — Bericht

## Ursache des Problems

Die Meldung **„Datenbank-Schema veraltet. Bitte ausführen: npx prisma migrate deploy“** kam **nicht** von Prisma selbst, sondern von einer **zu breiten Fehlererkennung** in `src/lib/prisma-errors.ts`.

`isMissingTableError()` und `isMissingColumnError()` prüften per Regex auf **`/does not exist/i`** in **jeder** Fehlermeldung. Dadurch wurden auch völlig andere Fehler fälschlich als Schema-Problem klassifiziert, z. B.:

- **Resend**: *„verify a domain … does not exist“*
- Andere API-/Netzwerkfehler mit „does not exist“ im Text

`handleApiError()` in `src/lib/api-response.ts` wandte diese Prüfung an und gab pauschal die Migrate-Deploy-Meldung zurück — obwohl `npx prisma db push` bereits erfolgreich war.

## Entfernte / geänderte Prüfungen

| Datei | Änderung |
|-------|----------|
| `src/lib/prisma-errors.ts` | Regex `/does not exist/i` entfernt; nur noch Prisma-Codes **P2021** (Tabelle) und **P2022** (Spalte) |
| `src/lib/api-response.ts` | Keine Migrate-Deploy-Meldung mehr; nutzt `formatApiErrorMessage()` |
| `src/lib/register-service.ts` | Spezifische DB-Fehlermeldung statt Migrate-Deploy |
| `src/app/api/profile/route.ts` | Spezifische DB-Fehlermeldung statt Migrate-Deploy |
| `src/app/api/nutrition/water/route.ts` | Hinweise auf `db push` statt `migrate deploy` |
| `src/lib/gamification-payload.ts` | Interne Log-Meldungen angepasst |

## Neue Dateien / zentrale Logik

- **`src/lib/format-api-error.ts`** — einheitliche, ehrliche API-Fehlermeldungen (DB, Prisma, Verbindung)
- **`scripts/test-support.ts`** — Testlauf für DB + optional E-Mail (`npm run support:test`, `--send` für Versand)

## Support-Workflow (repariert)

1. **Kontaktformular** (`/settings/support`) → POST `/api/support`
2. **ENV-Check** — fehlende `SUPPORT_EMAIL` / `RESEND_API_KEY` → klare Meldung
3. **Tabellen-Check** — `SupportRequest` fehlt → Hinweis `npx prisma db push`
4. **Speicherung** — `prisma.supportRequest.create()`
5. **E-Mails** — Team + Bestätigung via Resend/SMTP; bei Fehler nur **Server-Log-Warnung**, Anfrage bleibt gespeichert
6. **Erfolg** — `{ ok: true, emailSent: boolean }` → Bestätigungs-UI (ohne E-Mail-Versprechen wenn `emailSent: false`)

## Erkannte ENV-Variablen (Testlauf)

| Variable | Status |
|----------|--------|
| `SUPPORT_EMAIL` | grnd.office@gmail.com |
| `RESEND_API_KEY` | gesetzt |
| `EMAIL_FROM` | AI Fitness Coach \<onboarding@resend.dev\> |
| `APP_NAME` | NEXFORM |
| `SMTP_HOST` | nicht gesetzt (Resend wird genutzt) |

## Tests

```bash
npm run support:test          # DB + Tabelle + Create/Delete ✓
npm run support:test -- --send # zusätzlich E-Mail-Versand (Resend-Sandbox: Empfänger = verifizierte Adresse)
npm run build                 # Build erfolgreich ✓
```

## Warum das Formular jetzt funktioniert

- Schema-Fehler werden **nur noch bei echten Prisma P2021/P2022** erkannt
- **Resend-, ENV- und DB-Fehler** erscheinen mit der **tatsächlichen Ursache**
- Support-Route prüft ENV und Tabelle **vor** dem Speichern und fängt E-Mail-Fehler **getrennt** ab
- Nach erfolgreichem `db push` erscheint **keine** falsche Migrate-Deploy-Warnung mehr
