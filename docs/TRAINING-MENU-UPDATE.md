# Trainingsmenü — Vereinfachung & Quick Workout

Stand: Juni 2026 · `npm run build` erfolgreich

## Neue Struktur

```
Training (/workouts)
├── Meine Pläne (/workouts/my-plans)
│   ├── Plan erstellen (/workouts/create)
│   └── Plan bearbeiten (/workouts/plans/[id])
├── Vorgefertigte Pläne (/workouts/catalog)
│   └── Plan-Detail (/workouts/catalog/[key])
└── Quick Workout (/workouts/quick)
    └── Live-Training (/workouts/live/[sessionId])
```

Die Startseite zeigt nur noch **3 große Karten** (+ optional „Training fortsetzen“). Historie, Rekorde, Statistik und Übungsbibliothek sind nicht mehr auf der Hauptseite — weiterhin über direkte URLs erreichbar.

## Geänderte / neue Dateien

### Neu
- `src/app/(app)/workouts/quick/page.tsx` — Quick Workout Flow
- `src/components/workout/training-choice-card.tsx` — große Auswahlkarten
- `src/components/workout/workout-back-link.tsx` — einfache Zurück-Navigation
- `src/lib/catalog-presets.ts` — 7 vorgefertigte Plan-Kategorien

### Geändert
- `src/app/(app)/workouts/page.tsx` — 3-Karten-Startseite
- `src/app/(app)/workouts/my-plans/page.tsx` — minimal: Name, Übungen, letztes Training, Start
- `src/app/(app)/workouts/catalog/page.tsx` — einfache Planliste (7 Kategorien)
- `src/app/(app)/workouts/plans/[id]/page.tsx` — ohne Tab-Navigation
- `src/components/workout/exercise-picker-sheet.tsx` — Favoriten / Zuletzt / Häufig + Suche
- `src/components/workout/live-workout.tsx` — clean UI, große Touchflächen
- `src/app/api/workouts/plans/route.ts` — `lastSessionAt` pro Plan
- `src/app/api/workouts/sessions/route.ts` — Quick Workout Start mit Übungsliste

## Performance-Verbesserungen

| Bereich | Verbesserung |
|--------|--------------|
| Trainings-Start | Cache für Pläne + aktive Session, keine 8 Menüpunkte mehr |
| Meine Pläne | `useCachedFetch`, Skeleton statt leerer Seite |
| Quick Workout | Lokale Übungsliste, Session-Start mit vorgefüllten 3 Sätzen |
| Live-Training | Optimistisches Add/Delete, debounced Save (400 ms) |
| Übungs-Picker | 120 ms Debounce, Server-Cache, Tabs ohne Extra-Schritte |

## Behobene Probleme

- Zu komplexes Trainingsmenü (8+ HubCards → 3 Karten)
- Überladene „Meine Pläne“-Seite (Archiv/Duplizieren/Stats-Grid entfernt)
- Überladene Plan-Bibliothek (Filter/Wissenschaft-UI → 7 klare Kategorien)
- Kein spontanes Training ohne Plan → **Quick Workout**
- Tab-Navigation auf jeder Unterseite → einfacher Zurück-Link
- Live-Workout: kleine Buttons → h-14 Touchflächen, nur Satz hinzufügen/löschen

## Quick Workout Ablauf

1. Training → Quick Workout
2. Übungen per Popup hinzufügen
3. „Training starten“ → Live-Session mit je 3 Sätzen
4. Kein Plan wird gespeichert
