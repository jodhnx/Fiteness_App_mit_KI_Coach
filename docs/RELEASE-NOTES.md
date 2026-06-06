# Release: Fitness-App Update + Bugfix (Juni 2026)

## Zusammenfassung

Großes Update mit Fokus auf **Kalorienziel sofort beim ersten Render**, **DACH-Ernährung**, **Trainingsplan-Übungssuche (395 Übungen)**, **Trophäenraum mit Suche/Filter**, **Optimistic Updates** und **Build-Stabilität**.

`npm run build` — **erfolgreich** (TypeScript + Next.js 15.5).

Details zum letzten kritischen Update: [`docs/KRITISCHES-UPDATE-BERICHT.md`](./KRITISCHES-UPDATE-BERICHT.md).

---

## Kalorienziel (höchste Priorität)

- Zentrale Berechnung: `src/lib/calorie-target.ts` (Mifflin-St Jeor, TDEE, Ziel-% je nach Ernährungsziel, Trainingstage, Schritte/Cardio, Zielgewicht-Datum).
- Kein Standard-Fallback auf 2000 kcal in Home, Ernährung, Dashboard und Coach-Kontext.
- **Einstellungen**: Live-Vorschau bei jeder Änderung; nach Speichern sofort `publishNutritionDashboard` + Home-Cache-Update.
- Nach Profil-Speichern: Coach- und Insights-Caches werden invalidiert (keine veralteten KI-Hinweise).

---

## Trainingspläne

- **Übungssuche** im Plan-Editor (`/workouts/plans/[id]`):
  - Hook `use-exercise-library-search.ts`: Debounce, Filter (Muskel, Equipment, Schwierigkeit), bis 120 Treffer, Abbruch bei neuer Suche.
  - API `GET /api/exercises` mit erweitertem Limit; `POST` für **eigene Übungen**.
- Übungen zu Trainingstagen: hinzufügen, entfernen, Sätze/Wiederholungen/Pause bearbeiten, Drag & Drop-Reihenfolge.
- Bibliothek: nach `npm run db:seed` / `db:seed:exercises` **155+** Übungen in der DB (API bis 200).

---

## Ernährung

- **Optimistic Updates** über `publishNutritionDashboard` / `applyNutritionMutationResponse`.
- Home nutzt `useSyncedNutrition` und reagiert auf `nutrition-dashboard-updated` — keine sichtbare Voll-Neuladung nach Quick-Add/Löschen.

---

## Home: Verbrannte Kalorien

- „Verbrannt“ = `health.today.caloriesBurned` (nur Aktivität des Tages).
- Ohne Aktivität: **0 kcal** (kein BMR, keine Platzhalter).

---

## Profilbild

- Upload-API speichert auf Vercel/DB als Data-URL (`AVATAR_STORAGE=database` oder Produktion).
- Vorschau, Speichern, Session-Update nach Upload; Bild in Header/Profil nach Reload.

---

## Erfolge, Trophäen, XP

- **136 Erfolge** im Katalog (`achievement-catalog.ts`), u. a.:
  - Training: 1–1000 Workouts, Streaks 3–100 Tage
  - Ernährung: Tracking 1/7/30/100 Tage, Protein 100/150/200 g/Tag
  - Gewicht, Schritte, Challenges (bis 50), PRs (bis 50)
- **Trophäenraum**: Bronze → Legendär, nach Stufen gruppiert.
- **XP / Level 1–100** (`level-system.ts`), Fortschrittsbalken, Levelaufstieg-Toast mit Animation.
- Metriken für neue Erfolge in `achievement-metrics.ts`.
- DB: `npm run db:seed` (Achievements in DB anlegen).

---

## Performance & Bugs

- Weniger unnötige Cache-Invalidierung nach Profil-Speichern.
- Settings: Fetch-Timeout, `finally` beim Speichern (kein endloses „Speichern…“).
- Client-Cache + Event-Bus für Ernährung/Home.

---

## Deployment-Hinweise

1. `npx prisma db push` (falls Schema geändert)
2. `npm run db:seed` (Übungen + Achievements)
3. `npm run build`
4. Env: `DATABASE_URL` (Supabase Pooler: `?pgbouncer=true` auf Port 6542)

---

## Manuelle Test-Checkliste

| Bereich | Test |
|--------|------|
| Kalorienziel | Gewicht/Ziel/Datum/Aktivität ändern → Home + Ernährung zeigen gleiches Ziel, nicht 2000 |
| Settings | Speichern → Erfolg-Toast, kein Hänger |
| Trainingsplan | Suche „Bankdrücken“, Filter, Übung hinzufügen/entfernen/bearbeiten, DnD |
| Ernährung | Lebensmittel quick-add → Home-Makros sofort |
| Home | Verbrannt = 0 ohne Workout/Health |
| Avatar | Upload → Reload → Header sichtbar |
| Erfolge | Liste lädt, Trophäen-Tabs, Level-Balken |

---

## Geänderte Kern-Dateien

- `src/lib/calorie-target.ts`, `nutrition-service.ts`, `home-data.ts`, `nutrition-sync.ts`
- `src/app/(app)/settings/page.tsx`, `src/app/api/profile/route.ts`
- `src/app/(app)/workouts/plans/[id]/page.tsx`, `src/hooks/use-exercise-library-search.ts`
- `src/app/api/exercises/route.ts`, `src/app/api/profile/avatar/route.ts`
- `src/lib/achievement-catalog.ts`, `achievement-metrics.ts`
- `src/components/gamification/trophy-room.tsx`, `gamification-unlock-toast.tsx`
