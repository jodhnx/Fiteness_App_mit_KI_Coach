# Kalorienziel & Ernährung — Update (Juni 2026)

## Kalorienziel (höchste Priorität)

### Ursache
- Beim Speichern in den Einstellungen wurde das **alte** `calorieTarget` mitgeschickt und überschrieb die Neuberechnung.
- `applySmartGoalsToProfilePatch` behielt `patch.calorieTarget`, sobald ein Wert gesetzt war.
- Leere/Platzhalter-States nutzten **2000 kcal** als Fallback.

### Lösung
- Zentrale Berechnung in `src/lib/calorie-target.ts`:
  - TDEE + Ernährungsziel
  - Smart Goals (Zielgewicht + Wunschdatum)
  - Alle Makros konsistent daraus
- Profil-PATCH berechnet bei Änderungen von Gewicht, Zielgewicht, Datum, Aktivität, Trainingstagen, Ernährungsziel **immer** neu (außer explizit manuelle Makros in der Sektion Ernährung).
- Einstellungen: Live-Vorschau beim Tippen; Makro-Felder leer = automatisch; nach Speichern Formular aus API-Antwort.
- Keine 2000-kcal-Platzhalter mehr in Home-, Dashboard- und Nutrition-Defaults.

## Ernährung

- Lebensmittel-Einträge löschen (optimistisches UI, dann API).
- Menge bearbeiten (`PATCH /api/nutrition/items/[id]`).
- Ganze Mahlzeit löschen (`DELETE /api/nutrition/meals/[id]`).
- Makros/Kalorien sofort nach Mutation über `dashboard` in der Antwort.

## UX

- Toasts: `bottom-center` mit Offset über Bottom-Nav + Safe Area.
- Home „Heute“: kein 2000er-Flash; Hinweis wenn Profil unvollständig.

## Betroffene Dateien (Auswahl)

- `src/lib/calorie-target.ts` (neu)
- `src/lib/smart-goals.ts`, `src/app/api/profile/route.ts`
- `src/lib/nutrition-service.ts`, `src/lib/nutrition-defaults.ts`, `src/lib/home-defaults.ts`
- `src/app/(app)/settings/page.tsx`, `src/app/(app)/nutrition/page.tsx`
- `src/lib/nutrition-sync.ts`, `src/app/layout.tsx`
