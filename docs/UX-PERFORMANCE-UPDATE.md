# UX & Performance Update — Juni 2026

## Status

| Prüfung | Ergebnis |
|---------|----------|
| `npm run build` | ✅ Erfolgreich |
| Übungen mit 3 Sätzen (Gewicht/Wdh) | ✅ |
| Hauptmenü: Fortschritt statt Aktivität | ✅ |
| Fortschritt-Seite ausgebaut | ✅ |
| Navigation Prefetch | ✅ |

---

## 1. Trainingsplan — Übungsverwaltung

**Vorher:** Nur Sätze-Anzahl und Wdh-Range als kleine Inputs.

**Nachher:**
- Beim Hinzufügen einer Übung werden **3 Sätze** automatisch angelegt
- Pro Satz: **Gewicht (kg)** | **Wiederholungen**
- **+ Satz hinzufügen** / **Papierkorb pro Satz** / **Übung löschen**
- Große Touch-Inputs (`h-11`, `inputMode` für Mobile)
- Drag & Drop-Reihenfolge bleibt erhalten

**Technik:**
- Neues DB-Feld `WorkoutExercise.setTargets` (JSON)
- `src/lib/plan-exercise-sets.ts` — Parsing & Defaults
- `src/components/workout/plan-exercise-sets-card.tsx` — Gym-App UI
- API `PATCH/POST` speichert `setTargets` + synchronisiert `targetSets`

---

## 2. Performance / weniger Delay

- **Bottom-Nav:** `<Link prefetch>` für alle 5 Haupttabs
- **RoutePrefetcher:** lädt sofort `/home`, `/workouts`, `/progress`, `/nutrition`, `/coach`
- **Fortschritt:** `revalidateOnMount: false` + Client-Cache-Fallback
- **App-Template:** leichte Opacity-Transition ohne Blocking-Spinner
- Kein API-Warmup beim Tab-Wechsel (verhindert DB-Stau)

---

## 3. Hauptmenü

**Neu (Bottom + Sidebar Primary):**

| Tab | Route |
|-----|-------|
| Home | `/home` |
| Training | `/workouts` |
| **Fortschritt** | `/progress` |
| Ernährung | `/nutrition` |
| Coach | `/coach` |

**Entfernt aus Hauptmenü:** Aktivität

**Weiterhin erreichbar:** `/activities` über Sidebar → „Aktivität & Schritte“ (Schritte/Schlaf)

---

## 4. Fortschritt-Seite

Neue Sektionen (via `loadProgressDashboardExtras`):

- Gewichtsentwicklung (bestehend, erweitert)
- **Kalorienverlauf** (30 Tage)
- **Proteinverlauf** (30 Tage)
- **Trainingshistorie** (letzte 8 Sessions)
- **Streaks** (Training + Aktiv)
- **Erfolge** (Snippet + Link zu `/erfolge`)
- **Persönliche Rekorde** (Top 6 + Link zu `/workouts/records`)

---

## Deployment

Schema-Änderung (`setTargets` auf `WorkoutExercise`):

```bash
npx prisma db push
```

Dann deployen wie gewohnt.

---

## Geänderte Dateien

| Datei | Änderung |
|-------|----------|
| `prisma/schema.prisma` | `setTargets Json?` |
| `src/lib/plan-exercise-sets.ts` | Neu |
| `src/components/workout/plan-exercise-sets-card.tsx` | Neu |
| `src/app/(app)/workouts/plans/[id]/page.tsx` | Neue Übungs-UI |
| `src/app/api/workouts/plans/[id]/exercises/route.ts` | setTargets API |
| `src/components/layout/bottom-nav.tsx` | Fortschritt statt Aktivität |
| `src/components/layout/sidebar-nav.tsx` | Nav-Reihenfolge |
| `src/components/layout/route-prefetcher.tsx` | Alle Haupttabs |
| `src/lib/nav-active.ts` | `/progress` |
| `src/lib/progress-dashboard.ts` | Neu |
| `src/components/progress/progress-dashboard-sections.tsx` | Neu |
| `src/app/api/progress/route.ts` | Dashboard-Daten |
| `src/app/(app)/progress/page.tsx` | Erweiterte UI |
| `src/app/(app)/template.tsx` | Schnelle Übergänge |
| `src/components/home/home-quick-actions.tsx` | Link → Fortschritt |

---

## Manuelle Tests

1. Trainingsplan → Übung hinzufügen → 3 Sätze sichtbar → Gewicht/Wdh eintragen → Reload → gespeichert
2. Satz +/− testen
3. Bottom-Nav: Home ↔ Training ↔ Fortschritt ↔ Ernährung ↔ Coach
4. Fortschritt: Charts, Historie, Streaks, PRs
5. Mobile: große Inputs im Plan-Editor
