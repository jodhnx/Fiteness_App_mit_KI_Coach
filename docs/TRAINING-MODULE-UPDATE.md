# Training-Modul — Premium-Optimierung

Stand: Juni 2026 · `npm run build` erfolgreich

## Performance-Verbesserungen

| Bereich | Vorher | Nachher |
|--------|--------|---------|
| Übungssuche Debounce | 250 ms | 120 ms (Picker) / 150 ms (Standard) |
| Übungssuche API | Jede Anfrage → DB | 120 s In-Memory-Cache (`exercise-search-cache.ts`) |
| Plan-Editor laden | Vollständiger Reload bei jeder Aktion | `useCachedFetch` + Skeleton, optimistische UI |
| Übung hinzufügen | Sidebar + Filter + Toast + Reload | Fullscreen-Picker, optimistisches Einfügen, kein Reload |
| Übung löschen | API → `load()` | Optimistisches Entfernen, Rollback bei Fehler |
| Satz speichern | PATCH bei jedem Tastendruck | 400 ms Debounce + sofortiges UI-Update |
| Live-Workout | Nur Satz-Fortschritt | + Gesamtvolumen (kg) in Echtzeit |
| Workout starten | Ignorierte Plan-Sätze | Nutzt `setTargets` aus dem Plan (Gewicht/Wdh) |

### Geschätzte Ladezeiten (subjektiv / typisches 4G)

| Aktion | Vorher | Nachher |
|--------|--------|---------|
| Plan-Editor öffnen | ~800–1500 ms (leerer Screen „Lädt…“) | ~0 ms mit Cache, Skeleton sonst |
| Übungssuche (2. Treffer) | ~400–700 ms | ~0 ms (Cache-Hit) / ~200–350 ms |
| Übung hinzufügen (UI) | ~500 ms bis sichtbar | **Sofort** (optimistisch) |
| Satz bearbeiten | spürbar ruckelig | flüssig (debounced Save) |
| Seitenwechsel Training | teils Spinner | Cache-Warmer + kein Full-Reload |

## Neuer Ablauf: Workout erstellen

1. **+ Workout erstellen** (`/workouts/create`)
2. Workout-Name
3. Kategorie (Push, Pull, Beine, Oberkörper, Unterkörper, Ganzkörper, Eigenes)
4. **Workout speichern** → direkt in den Editor

Kein 2-Schritt-Flow, keine Tagesanzahl-Auswahl mehr.

## Übungen hinzufügen

- Fullscreen-**ExercisePickerSheet**: Suche, Häufig, Zuletzt, Favoriten
- Ein Klick = sofort im Workout (3 Standard-Sätze)
- Duplikate werden in API (409) und UI blockiert

## Live-Training

- Große Schrift, Satz abhaken, Rest-Timer (90 s)
- Trainingsdauer + Fortschritt + **Gesamtvolumen**

## Geänderte / neue Dateien

### Neu
- `src/lib/workout-categories.ts`
- `src/lib/exercise-search-cache.ts`
- `src/components/workout/exercise-picker-sheet.tsx`
- `src/components/workout/plan-stats-bar.tsx`

### Geändert
- `src/app/(app)/workouts/create/page.tsx` — vereinfachter Flow
- `src/app/(app)/workouts/plans/[id]/page.tsx` — Premium-Editor, Picker, Stats
- `src/app/(app)/workouts/my-plans/page.tsx` — Stats-Karten, Link statt `prompt()`
- `src/app/(app)/workouts/page.tsx` — Button „+ Workout erstellen“
- `src/components/workout/plan-exercise-sets-card.tsx` — Debounced Save
- `src/components/workout/live-workout.tsx` — Volumen-Anzeige
- `src/hooks/use-exercise-library-search.ts` — konfigurierbares Debounce
- `src/app/api/exercises/route.ts` — Response-Cache
- `src/app/api/workouts/plans/[id]/exercises/route.ts` — Duplikat-Schutz, Recent-Tracking
- `src/app/api/workouts/plans/[id]/route.ts` — `dayStats` (letztes Training, Volumen)
- `src/app/api/workouts/sessions/route.ts` — Plan-`setTargets` beim Start

## Behobene Bugs

- Langsame Übungssuche (Debounce + Server-Cache)
- Langsames Speichern der Sätze (Debouncing statt Request pro Keystroke)
- Doppelte Übungen im selben Workout (API + Picker-Exclude)
- Delays beim Hinzufügen/Löschen/Bearbeiten (optimistische Updates)
- Live-Session ignorierte geplante Gewichte/Wiederholungen
- `prompt()`-Dialog beim Plan erstellen in Meine Pläne
- Layout: Plan-Editor mobile-first, eine Spalte, weniger Buttons

## Hinweis Datenbank

Auth und alle DB-Features benötigen weiterhin gültige Supabase-URLs in `.env`. Siehe `docs/SUPABASE-CONNECTION-FIX.md`.
