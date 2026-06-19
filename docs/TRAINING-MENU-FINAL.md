# Trainingsmenü — Finale Überarbeitung

Stand: Juni 2026 · `npm run build` erfolgreich

## Neue Trainingsstruktur

```
Training (/workouts)
│
├── TRAINIEREN
│   ├── Meine Pläne          → /workouts/my-plans
│   ├── Vorgefertigte Pläne  → /workouts/catalog (5 Kategorien)
│   └── Quick Workout        → /workouts/quick
│
└── MEHR
    ├── Fitness Journey      → /workouts/journey  (NEU)
    ├── Rekorde              → /workouts/records
    └── Übungen              → /workouts/exercises (Exercise Hub)

Weiterleitungen:
  /workouts/history   → /workouts/journey
  /workouts/analytics → /workouts/journey
```

## Neue Bereiche

### Fitness Journey (`/workouts/journey`)
Kombiniert Historie + Gym Check-In in einer Ansicht:
- Streak & längster Streak
- Trainingsdauer & Volumen (30 Tage)
- Gym Check-In Kalender
- Letzte 8 Trainings (Dauer, Volumen, Übungen)
- Sessions & Gym-Besuche im Monat

**API:** `GET /api/workouts/journey` — ein Request für alle Journey-Daten

### Rekorde (`/workouts/records`)
- **Hauptlifts:** Bankdrücken, Kniebeuge, Kreuzheben, Schulterdrücken
- **Highlights:** Schwerster Satz, meiste Wdh, höchstes Session-Volumen
- Weitere PRs als kompakte Liste

**API:** `GET /api/workouts/prs` erweitert um `keyLifts` + `highlights`

### Übungen / Exercise Hub (`/workouts/exercises`)
- Suchleiste (120 ms Debounce + Cache)
- Muskelgruppen-Chips
- Tabs: Alle · Favoriten · Zuletzt
- Detail-Karte: Zielmuskel, Schwierigkeit, Equipment
- Link zu Ausführung & Statistik

## Geänderte Dateien

### Neu
- `src/lib/workout-journey.ts`
- `src/lib/record-highlights.ts`
- `src/app/api/workouts/journey/route.ts`
- `src/app/(app)/workouts/journey/page.tsx`

### Überarbeitet
- `src/app/(app)/workouts/page.tsx` — 6 große Karten (3 + 3)
- `src/app/(app)/workouts/records/page.tsx` — Key Lifts + Highlights
- `src/app/(app)/workouts/exercises/page.tsx` — Exercise Hub
- `src/app/(app)/workouts/history/page.tsx` — Redirect → Journey
- `src/app/(app)/workouts/analytics/page.tsx` — Redirect → Journey
- `src/app/api/workouts/prs/route.ts` — Key Lifts & Highlights
- `src/lib/catalog-presets.ts` — 5 vorgefertigte Pläne

## Performance

| Bereich | Verbesserung |
|--------|--------------|
| Trainings-Start | 3 parallele Cache-Fetches (Session, Pläne, Journey-Preview) |
| Fitness Journey | 1 kombinierter API-Call statt History + Analytics + Calendar |
| Rekorde | 1 Call mit parallel `keyLifts`, `highlights`, `prCenter` |
| Exercise Hub | Cached Search, lazy Tabs, kein WorkoutNav |
| Historie/Analytics | Redirect — keine doppelten schweren Seiten mehr |

## Behobene / vereinfachte Punkte

- Verschachteltes Tab-Menü (`WorkoutNav`) auf Hauptflows entfernt
- Historie + Check-In doppelt → **Fitness Journey**
- Rekorde ohne Big-4-Lifts → dedizierte Key-Lift-Karten
- Übungsseite überladen → schlanker Exercise Hub
- Trainings-Hub zu voll → klare Trennung „Trainieren“ / „Mehr“
- Vorgefertigte Pläne auf 5 Kern-Kategorien fokussiert

## Hinweis

DB-Features benötigen gültige Supabase-URLs in `.env` (siehe `docs/SUPABASE-CONNECTION-FIX.md`).
