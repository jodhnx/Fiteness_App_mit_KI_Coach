# Performance & Training Flow Update

## Onboarding / Registrierung (8 Steps)

| Step | Inhalt |
|------|--------|
| 1 | Name (Vor- + Nachname) |
| 2 | Alter (Slider 18–80) & Geschlecht |
| 3 | Größe & Gewicht |
| 4 | Trainingsziel |
| 5 | Erfahrungslevel |
| 6 | Trainingstage/Woche (1–7) |
| 7 | E-Mail, Passwort, AGB |
| 8 | Zusammenfassung + Kalorienziel (Mifflin-St Jeor) |

**Route:** `/register` → `src/components/onboarding/registration-flow.tsx`  
**Utils:** `src/lib/calorie-calculator.ts`, `src/lib/storage-service.ts`  
**Design:** Glasmorphism, animierte Progress-Bar, Slide-Übergänge (nur Onboarding)

Nach Account-Erstellung: Auto-Login → `/api/onboarding` → Cache-Warmup → `/home`

## Screen mapping

| Spec (React Native style) | App path |
|---|---|
| `MyPlansScreen` | `/workouts/my-plans` |
| `PlanDetailScreen` | `/workouts/plans/[id]/days` |
| `WorkoutDayScreen` | `/workouts/plans/[id]/days/[dayId]` |
| `ActiveWorkoutScreen` | `/workouts/live/[sessionId]` |
| `FitnessJourneyScreen` | `/workouts/journey` |
| `ProgressScreen` | `/progress` |

## Components & utils

| Spec | Implementation |
|---|---|
| `DayStatusIndicator` | `src/components/workout/day-status-indicator.tsx` |
| `ExerciseItem` | `src/components/workout/exercise-item.tsx` |
| `WorkoutCard` | `src/components/workout/workout-card.tsx` |
| `WeightInput` | `src/components/progress/weight-quick-entry.tsx` |
| `cacheManager` | `src/lib/cache-manager.ts` |
| `storageService` | `src/lib/storage-service.ts` |

## Performance rules

- **Parallel prefetch** at app start: `warmTrainingCaches()` in `route-prefetcher.tsx` loads plans, journey, progress in parallel.
- **No artificial delays**: no `setTimeout`, no `Animated.timing`, no `InteractionManager`, no `animate-pulse` on repeat visits.
- **Skeleton only on first load**: `hasScreenLoaded()` / `markScreenLoaded()` in `storage-service.ts`.
- **Cache-first**: `useCachedFetch` with `revalidateOnMount: false`, high `staleRatio`.
- **Day status**: green `#4CAF50` = completed within 14 days; gray = open.
- **Rest days**: nicht in Meine Pläne / Tag-Auswahl (nur Tage mit Übungen).

## User flows

1. **Meine Pläne** → plan list with day status chips → tap plan.
2. **Tag-Auswahl** → green/gray rows → tap day (rest days not clickable).
3. **Workout-Tag** → exercise list + instant **Training starten**.
4. **Live** → optional timer, instant **Training beenden** modal (`EndWorkoutDialog`).
5. **Fitness Journey** → `WorkoutCard` with edit/delete; edit at `/workouts/journey/[id]/edit`.
6. **Fortschritt** → stats, weight entry, body transformation, training history from cache.

## Cache invalidation

After delete or edit of a workout session, invalidate:

- `workouts-journey-full`
- `workouts-my-plans-list` (day status)
- `progress` dashboard
