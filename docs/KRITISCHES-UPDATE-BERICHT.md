# Kritisches Feature & Bugfix Update — Juni 2026

## Status

| Prüfung | Ergebnis |
|---------|----------|
| `npm run build` | ✅ Erfolgreich (TypeScript + Next.js 15.5) |
| Kalorienziel sofort | ✅ Server-Prefetch + Client-Cache |
| Home ↔ Ernährung Sync | ✅ Gleiche Quelle (`loadNutritionDashboard`) |
| Übungsbibliothek | ✅ 395 Übungen + Auto-Seed bei leerer DB |
| Erfolge / Trophäenraum | ✅ 136 Erfolge, Suche + Filter |
| Lebensmittel DE/AT | ✅ Fuzzy-Suche, OFF-Ranking, Seed integriert |

---

## 1. Kalorienziel sofort verfügbar

**Problem:** Beim ersten Laden erschien „In Einstellungen festlegen“ / „Kcal Ziel festlegen“, obwohl Profildaten vorhanden waren.

**Lösung:**

- **Server-Prefetch** im App-Layout (`src/app/(app)/layout.tsx`): `loadNutritionDashboard()` lädt Kalorienziel und Tages-Makros vor dem ersten Client-Render.
- **`NutritionDataProvider`** (`src/components/providers/nutrition-data-provider.tsx`): seedet `nutrition-dashboard` und `home-data` Caches synchron beim Mount.
- **Home** (`home/page.tsx`): nutzt `usePrefetchedNutrition()` + `useSyncedNutrition()` — kein Warten auf `/api/home` für Makros.
- **Ernährung** (`nutrition/page.tsx`): Warnung „Ziele fehlen“ nur wenn `targets.calories <= 0`.
- **Heute-Karte** (`heute-hero-card.tsx`): `hasGoal = goal > 0` — kein 2000-kcal-Fallback.

Berechnung weiterhin zentral in `src/lib/calorie-target.ts` (Gewicht, Zielgewicht, Zieldatum, Geschlecht, Alter, Größe, Aktivität, Training, Cut/Bulk/Recomp/Erhaltung). Neuberechnung bei Einstellungsänderung über `publishNutritionDashboard`.

---

## 2. Ernährung Deutschland + Österreich

- **Lokale Suche** (`food-database-service.ts`): tokenbasierte, fehlertolerante Suche (mehrere Suchbegriffe, case-insensitive).
- **Open Food Facts** (`open-food-facts-client.ts`): DACH-Ranking mit Marken Billa, Spar, Hofer, Lidl, Penny, Rewe, DM, Müller u. a.
- **Suchlimits** erhöht (`nutrition-search-service.ts`): mehr lokale + OFF-Treffer.
- **Food-Seed** in `npm run db:seed` integriert (überspringbar mit `SEED_FOODS=0`).
- **Optimistic Updates** unverändert aktiv: `publishNutritionDashboard` aktualisiert Home + Ernährung sofort.

Barcode-Vorbereitung: `barcode`-Feld in FoodItem + `/api/food/barcode/[ean]`.

---

## 3. Eigene Trainingspläne

- **395 Übungen** in `exercise-library.ts` + `exercise-library-bulk.ts` (Kategorien: Brust, Rücken, Beine, Schultern, Arme, Bauch, Cardio).
- **Auto-Seed** (`exercise-seed-runtime.ts`): `GET /api/exercises` legt Bibliothek an, wenn DB &lt; 50 Einträge.
- **Plan-Editor** (`workouts/plans/[id]/page.tsx`): Debounced Suche, Filter, Hinzufügen/Entfernen, Persistenz über API.

Nach Deploy: einmalig `npm run db:seed` oder erste Übungssuche triggert Seed.

---

## 4. Erfolge — Trophäenraum

- **136 Erfolge** in `achievement-catalog.ts` (Training, Ernährung, Gewicht, Protein, Kalorien, Schritte, Challenges, Streaks, PRs, Trainingszeit).
- **Trophäenraum** (`trophy-room.tsx`):
  - Stufen: Bronze → Legendär
  - Suche nach Name/Beschreibung
  - Filter: Stufe, Status (freigeschaltet/in Arbeit/gesperrt), Kategorie
  - Stufen- und Listen-Ansicht
  - Freischaltdatum + XP-Anzeige
- **`/erfolge/trophaeen`** nutzt dieselbe `TrophyRoom`-Komponente.
- **Fiber-Metrik** in `achievement-metrics.ts` behoben (`fiber_goal_days` war hardcoded 0).

---

## 5. Performance

- Nutrition-Prefetch reduziert sichtbare Ladezeit auf Home/Ernährung.
- `revalidateOnMount: false` auf Home-Cache — kein doppelter Request beim ersten Paint wenn Prefetch vorhanden.
- Event-Bus (`nutrition-dashboard-updated`) für optimistic Updates ohne Full-Reload.

---

## Deployment

```bash
npx prisma db push          # falls Schema geändert
npm run db:seed             # Übungen + Achievements + Lebensmittel
npm run build
```

Env: `DATABASE_URL`, `AUTH_SECRET`, optional `SEED_FOODS=0` zum Überspringen des Food-Seeds.

---

## Manuelle Tests

| Bereich | Erwartung |
|---------|-----------|
| Home (erster Load) | Kalorienziel sofort sichtbar, identisch mit Ernährung |
| Einstellungen ändern | Ziel sofort neu, kein Sprung auf 2000 |
| Ernährung Quick-Add | Home-Makros sofort |
| Lebensmittel-Suche | „Billa Hähnchen“, „Hofer Joghurt“ finden Treffer |
| Trainingsplan Editor | Suche „Kniebeuge“, Übung hinzufügen, nach Reload erhalten |
| Trophäenraum | Suche/Filter, Stufen-Ansicht, Freischaltdatum |

---

## Geänderte Dateien (Auswahl)

- `src/app/(app)/layout.tsx`
- `src/components/providers/nutrition-data-provider.tsx`
- `src/app/(app)/home/page.tsx`
- `src/app/(app)/nutrition/page.tsx`
- `src/components/home/heute-hero-card.tsx`
- `src/hooks/use-synced-nutrition.ts`, `use-nutrition-dashboard.ts`
- `src/lib/food/food-database-service.ts`, `open-food-facts-client.ts`, `nutrition-search-service.ts`
- `src/data/exercise-library-bulk.ts`, `exercise-library.ts`
- `src/lib/exercise-seed-runtime.ts`, `src/app/api/exercises/route.ts`
- `src/components/gamification/trophy-room.tsx`
- `src/app/(app)/erfolge/trophaeen/page.tsx`
- `src/lib/achievement-metrics.ts`
- `prisma/seed.ts`, `prisma/seed-foods.ts`
