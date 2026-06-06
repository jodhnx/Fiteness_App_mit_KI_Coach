# NEXFORM – Final UX, Ernährung & Coach Update

**Datum:** Juni 2026  
**Build:** `npm run build` erfolgreich (0 TypeScript-Fehler)

---

## 1. Kalorienziel-Synchronisierung (kritischer Bug)

**Problem:** Nach Hinzufügen/Bearbeiten/Löschen von Lebensmitteln aktualisierte sich Ernährung, aber Home zeigte veraltete „offene Kalorien“.

**Ursache:** `useSyncedNutrition` überschrieb beim Navigieren zu Home den frischen Nutrition-Cache mit stale `initial`-Daten aus dem `/api/home`-Bundle.

**Lösung:**

| Datei | Änderung |
|-------|----------|
| `src/lib/nutrition-sync.ts` | Zentrale `publishNutritionDashboard()` – aktualisiert Nutrition-, Home- und Progress-Cache; feuert `NUTRITION_DASHBOARD_EVENT` + `HOME_DATA_EVENT` |
| `src/lib/nutrition-day.ts` | Tages-Key + `isNutritionDashboardToday()` für Mitternachts-Rollover |
| `src/hooks/use-synced-nutrition.ts` | Stale-Overwrite entfernt; Event-Listener + Tagesvalidierung |
| `src/hooks/use-home-live-data.ts` | Home reagiert sofort auf Nutrition-Events |
| `src/app/(app)/home/page.tsx` | Kombiniert Live-Home- und Nutrition-Daten |
| `src/app/(app)/progress/page.tsx` | Dashboard-Sektionen hören auf Nutrition-Events |
| `src/components/providers/nutrition-data-provider.tsx` | Cache-Seed mit Tagesprüfung |

**Ergebnis:** Kalorienziel, verzehrte und verbleibende kcal sind auf Home, Ernährung, Fortschritt und Dashboard **identisch und sofort** nach jeder Mutation.

---

## 2. Tagesreset Ernährung

- Mahlzeiten sind **tagesbasiert** (`startOfDay` in `loadNutritionDashboard`).
- Neuer Tag startet bei **0 kcal**; ältere Tage bleiben in Historie/Wochenansicht.
- `ensureNutritionCacheIsToday()` invalidiert veraltete Client-Caches bei Tageswechsel.

---

## 3. Hauptmenü-Reihenfolge

Überall konsistent:

1. Home  
2. Training  
3. Ernährung  
4. Fortschritt  
5. Coach  

**Dateien:** `bottom-nav.tsx`, `sidebar-nav.tsx`, `route-prefetch.ts`, `route-prefetcher.tsx`  
Aktivität bleibt in der Sidebar als Sekundärlink.

---

## 4. Erfolge & Trophäen (289 Achievements)

**Gesamt:** **289** eindeutige Achievements (Ziel: 200+)

### Kategorien

| Kategorie | Beispiele |
|-----------|-----------|
| **Training** | Erstes Training, 10/50/100/250/500 Workouts, Trainings-Streaks, Volumen, Trainingszeit |
| **Gewicht** | 1–30 kg Verlust/Zunahme, Gewichts-Logs |
| **Ernährung** | 7/30/100 Tage Tracking, Mahlzeiten, Kalorienziel-Tage, Hydration |
| **Protein** | 80–300 g/Tag, Protein-Streaks |
| **Schritte** | 5k–25k/Tag, Wochen- und Gesamtsummen |
| **Streaks** | 3–365 Tage aktiv |
| **Trainingszeit** | 10h–500h |
| **Level** | Level 1–100 (XP-basiert) |
| **Challenges, Schlaf, KI, Aktivitäten** | Erweiterte Meilensteine |

### Seltenheitsstufen (Trophäenraum)

Bronze → Silber → Gold → Platin → Diamant → **Mythic** → Legendär

**Dateien:** `achievement-catalog.ts`, `achievement-catalog-bulk.ts`, `trophy-room.tsx`, `tier-styles.ts`, `achievement-metrics.ts` (`user_level` Metrik)

---

## 5. Coach Mobile Redesign

**Layout (mobil-first):**

1. **Oben:** Schnellaktionen (Trainingsplan, Kalorien, Makros, Protein, Gewicht)  
2. **Mitte:** Chatverlauf (scrollbar)  
3. **Unten:** Großes Eingabefeld – Placeholder „Nachricht an den Coach…“

**Dateien:** `coach/page.tsx`, `coach-quick-actions.tsx`

---

## 6. App-Name: NEXFORM

Rebranding in:

- `layout.tsx` (Metadata, PWA-Titel)
- `manifest.ts`
- Landing `page.tsx`
- `sidebar.tsx` (Logo: NEX**FORM**)
- `login/page.tsx`, `email.ts`, `health/route.ts`
- `openai.ts` (Coach-Prompt)
- Coach-Seite & Sidebar-Label „NEXFORM Coach“

---

## 7. Performance-Optimierungen

- **Optimistic Updates** via `publishNutritionDashboard` / `applyNutritionMutationResponse`
- **Event-basierte Sync** statt Polling oder verzögertem Refetch
- **Kein Stale-Overwrite** beim Tab-Wechsel
- **Route-Prefetch** auf Hauptnavigation ausgerichtet
- **Client-Cache** für Home, Nutrition, Progress mit Invalidierung bei Tageswechsel
- Mobile Navigation mit `prefetch`, `transform-gpu`, kompakter Bottom-Nav

---

## 8. Build & Qualität

```
npm run build → ✓ Compiled successfully
```

Nur bestehende ESLint-Warnungen (unbenutzte Variablen in älteren Dateien), keine neuen TypeScript- oder Build-Fehler.

---

## Geänderte / neue Dateien (Übersicht)

### Neu
- `src/lib/nutrition-day.ts`
- `src/hooks/use-home-live-data.ts`
- `src/data/achievement-catalog-bulk.ts`
- `docs/NEXFORM-FINAL-UPDATE.md`

### Kernänderungen
- `src/lib/nutrition-sync.ts`
- `src/hooks/use-synced-nutrition.ts`
- `src/lib/achievement-catalog.ts`
- `src/lib/achievement-metrics.ts`
- `src/app/(app)/coach/page.tsx`
- `src/components/coach/coach-quick-actions.tsx`
- `src/components/layout/bottom-nav.tsx`
- `src/components/layout/sidebar-nav.tsx`
- `src/components/layout/sidebar.tsx`
- `src/components/gamification/trophy-room.tsx`
- `src/app/(app)/home/page.tsx`
- `src/app/(app)/progress/page.tsx`
- Branding: `layout.tsx`, `page.tsx`, `login/page.tsx`, `email.ts`, `manifest.ts`

---

## Manuelle Tests (empfohlen)

1. Ernährung → Lebensmittel hinzufügen → sofort Home öffnen → verbleibende kcal prüfen  
2. Lebensmittel löschen → Fortschritt-Dashboard prüfen  
3. Navigation: Reihenfolge Home → Training → Ernährung → Fortschritt → Coach  
4. Coach auf Mobile: Schnellaktionen oben, Eingabe unten  
5. Erfolge/Trophäen: Mythic-Tier, Level 1–100 sichtbar  
6. Nach `npm run db:seed` oder App-Start: Achievement-Seed mit 289 Definitionen
