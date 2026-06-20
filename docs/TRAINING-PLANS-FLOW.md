# Trainingsmenü — Meine Pläne Flow

Diese Next.js-App verwendet **App Router** statt `/screens/*.js`. Entsprechende Zuordnung:

| Anforderung | Datei |
|-------------|--------|
| TrainingScreen | `src/app/(app)/workouts/page.tsx` |
| Meine Pläne | `src/app/(app)/workouts/my-plans/page.tsx` |
| PlanDetailScreen (Tagauswahl) | `src/app/(app)/workouts/plans/[id]/days/page.tsx` |
| WorkoutDayScreen | `src/app/(app)/workouts/plans/[id]/days/[dayId]/page.tsx` |
| ActiveWorkoutScreen | `src/app/(app)/workouts/live/[sessionId]/page.tsx` → `live-workout.tsx` |
| ExerciseListItem | `src/components/workout/exercise-list-item.tsx` |

## Flow

1. **Training → Meine Pläne** — Liste aller Pläne (klickbar)
2. **Plan antippen** → **Tagauswahl** (z. B. Oberkörper 1, Unterkörper 2)
3. **Tag antippen** → **Übungsliste** (`Name — 3 Sätze × 12 Wiederholungen`) + **Training starten**
4. **Live-Workout** → **Training beenden** → sofort Modal mit Name (z. B. Workout 001) → **Speichern** → History (Fitness Journey)

## Speicherung

- Pläne, Sessions und History: **Datenbank** (Prisma / Supabase)
- Workout-Nummern-Vorschlag: **localStorage** (`workout-save-seq`)
- Client-Cache: `useCachedFetch` für schnelle Navigation ohne Spinner

## Plan bearbeiten

Vollständiger Editor weiterhin unter `/workouts/plans/[id]` (Zahnrad auf der Tagauswahl).
