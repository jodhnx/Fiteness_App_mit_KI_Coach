# Performance, Coach & Settings Update

**Datum:** Juni 2026  
**Build:** `npm run build` ✓ erfolgreich

---

## 1. Fortschritt beschleunigt

| Maßnahme | Details |
|----------|---------|
| **Hintergrund-Prefetch** | `warmNavDataCaches()` lädt `/api/progress` + `/api/profile` idle im Hintergrund |
| **Längerer Cache** | TTL 180s, `staleRatio: 0.98`, kein Revalidate on Mount |
| **Sofortanzeige** | `getCached()` vor API — Seite rendert sofort mit Cache-Daten |
| **Skeleton** | `ProgressPageSkeleton` nur wenn kein Cache vorhanden |
| **Charts** | Animierte Skeleton-Placeholder statt leerer Fläche |
| **Memo** | `ProgressDashboardSections` mit `memo()` |

---

## 2. Coach Mobile (WhatsApp/ChatGPT-Stil)

- **Schnellaktionen** oben (inkl. „Protein analysieren“)
- **Chat** in der Mitte, scrollbar
- **Eingabefeld fixiert** über der Bottom-Nav (`position: fixed`)
- Placeholder: **„Nachricht an deinen Coach…“**
- Kein Scrollen nötig zum Schreiben
- `ChatBubble` memoized für weniger Re-Renders

---

## 3. Kcal-Ziel — zentrale Datenquelle

**Neues System:** `NutritionDataProvider` + `useCentralNutrition()`

- Eine Quelle für Kalorienziel, verbraucht, verbleibend, Protein, Carbs, Fett
- Server-Prefetch im App-Layout seedet den Store sofort
- `publishNutritionDashboard()` synchronisiert Home-, Progress- und Nutrition-Cache
- Home (`useHomeLiveData`) bevorzugt immer den Nutrition-Cache für Makros
- Fortschritt hört auf `useCentralNutrition()` für Live-Updates
- Optimistic Updates bei Add/Edit/Delete unverändert aktiv

---

## 4. Einstellungen — Profilkarte

**Neu:** `SettingsProfileHero`

- Großes Profilbild (28×28, Ring + Schatten)
- Name prominent
- **Immer sichtbar ohne Klicks:** Name, Alter, Gewicht, Größe, Geschlecht, Aktivitätslevel, Zielgewicht, Zieldatum, Ernährungsziel, Kalorienziel
- Modernes Karten-Design mit Gradient
- Bearbeiten öffnet Formular darunter

---

## 5. Performance allgemein

- Route-Prefetch für alle Haupttabs
- API-Cache-Warming im Idle-Callback
- React `memo` auf Coach-Bubbles, Progress-Sections
- Weniger doppelte Hooks (Home/Ernährung → `useCentralNutrition`)
- Kein unnötiger API-Refetch wenn Cache frisch

---

## 6. Behobene Bugs

| Bug | Fix |
|-----|-----|
| Kcal-Ziel fehlt beim Laden | Central Nutrition Store + Server-Seed |
| Home ≠ Ernährung Werte | Nutrition-Cache hat Priorität in `useHomeLiveData` |
| Verzögerte Sync nach Food-Entry | `publishNutritionDashboard` + Progress-Target-Patch |
| Coach Scroll zum Input | Fixed Input-Dock über Bottom-Nav |
| Fortschritt langsam | Prefetch + Cache-first + Skeleton |
| Einstellungen Daten versteckt | Profile Hero immer oben sichtbar |

---

## Geänderte / neue Dateien

### Neu
- `src/hooks/use-central-nutrition.ts`
- `src/lib/nav-cache-warmer.ts`
- `src/components/progress/progress-page-skeleton.tsx`
- `src/components/settings/settings-profile-hero.tsx`
- `docs/PERFORMANCE-COACH-SETTINGS-UPDATE.md`

### Kernänderungen
- `src/components/providers/nutrition-data-provider.tsx` — Live Store
- `src/hooks/use-nutrition-dashboard.ts`
- `src/hooks/use-home-live-data.ts`
- `src/hooks/use-synced-nutrition.ts`
- `src/lib/nutrition-sync.ts` — Progress-Target-Sync
- `src/app/(app)/coach/page.tsx`
- `src/app/(app)/progress/page.tsx`
- `src/app/(app)/home/page.tsx`
- `src/app/(app)/settings/page.tsx`
- `src/components/layout/route-prefetcher.tsx`
- `src/components/coach/coach-quick-actions.tsx`
- `src/components/charts/lazy-stat-chart.tsx`
- `src/components/progress/progress-dashboard-sections.tsx`
