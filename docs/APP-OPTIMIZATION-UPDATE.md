# App Optimierungs-Update — Bericht

## Zusammenfassung

Umfassendes Performance-, UX- und Onboarding-Update mit Fokus auf **Mobile-First**, **sofortige Navigation** und **weniger API-Last**.

---

## Gefundene & behobene Probleme

| Bereich | Problem | Fix |
|---------|---------|-----|
| **Home** | Kein Loading-Skeleton → White Screen beim ersten Load | `HomeLoadingSkeleton` mit Cache-first Anzeige |
| **Home** | Doppelte Metriken (Hero + Activity Overview) | Activity Overview entfernt, neues `HomeDashboardGrid` |
| **Home** | Recovery/Wochenbericht geladen aber nicht angezeigt | `HomeInsightCards` eingebunden + `memo` |
| **Home** | Section-Cache nie befüllt | `hydrateHomeSectionCaches()` nach `/api/home` |
| **Home** | Volle Re-Renders bei Nutrition-Events | `useCallback` für Training-Start, `memo` auf Widgets |
| **Profil-Header** | `/api/profile` bei jedem Mount | Fetch nur wenn Cache >92% stale |
| **Nav-Warmer** | 4× Food-Search + Profile bei App-Start | Food-Search nur auf Ernährungsseite, Profile nur wenn stale |
| **Onboarding** | 7 technische Schritte, kein Welcome | 5-Schritt Mobile-Flow mit NEXFORM Welcome |
| **Onboarding** | Kein Name, kein Plan-Screen | Name + personalisierter Plan mit Dauer-Schätzung |
| **Support** | (vorher) E-Mail blockierte Anfrage | Bereits behoben: DB-first, E-Mail optional |

---

## Performance-Verbesserungen

1. **Cache-first Home** — Sofortige Anzeige aus `HOME_DATA_CACHE_KEY`, kein White Screen
2. **Idle Background Refresh** — Stale Home-Daten werden im Hintergrund aktualisiert (ohne UI-Block)
3. **Profil-Deduplizierung** — SSR-Prefetch + Client-Cache, kein redundanter Fetch
4. **Nav-Warmer optimiert** — ~4 weniger API-Calls beim App-Start
5. **React.memo** — `HomeDashboardGrid`, `HomeInsightCards`, `HomeLoadingSkeleton`, `HeuteHeroCard`, `HomeGreeting`
6. **useCallback** — `onStartTraining` stabilisiert Quick-Actions

**Geschätzte Verbesserung:**
- First Paint Home: **~40–60% schneller** (Skeleton + Cache)
- App-Start API-Calls: **~5 weniger** Requests
- Tab-Wechsel: unverändert schnell (bestehendes Cache-System)

---

## Neue Features

### Onboarding (5 Schritte)

1. **Willkommen bei NEXFORM** — Feature-Übersicht mit Icons (KI Coach, Ernährung, Training, Fortschritt, Erfolge)
2. **Über dich** — Name, Geschlecht, Alter, Größe, Gewicht
3. **Dein Ziel** — Muskelaufbau, Fettverlust, Gewicht halten, Kraft, Fitness
4. **Aktivität** — 4 Stufen (wenig → sehr aktiv)
5. **Persönlicher Plan** — Kalorien, Protein, KH, Fett, geschätzte Dauer, Training/Woche

### Home Screen

- **Widget-Grid** (2 Spalten): Kalorien, Protein, Wasser, Schritte, Gewicht, Training, Nächstes Training, Streak, Level/XP
- **Insight Cards**: Regeneration + Wochenbericht
- **Greeting**: „Guten Morgen/Tag/Abend, NAME“ (bereits vorhanden, beibehalten)
- **Header**: Profilbild, Glocke, Menü (App-Shell)

---

## Lighthouse (geschätzt)

| Kategorie | Vorher (ca.) | Nachher (ca.) |
|-----------|--------------|---------------|
| Performance | 75–85 | **88–94** |
| Accessibility | 90–95 | **92–96** |
| Best Practices | 95–100 | **96–100** |
| SEO | 95–100 | **95–100** |

*Hinweis: Performance 95+ erfordert zusätzlich Bild-Optimierung, Service Worker und API-Splitting — empfohlen als nächster Schritt.*

---

## Geänderte Dateien

### Neu
- `src/components/home/home-dashboard-grid.tsx`
- `src/components/home/home-loading-skeleton.tsx`
- `docs/APP-OPTIMIZATION-UPDATE.md`

### Überarbeitet
- `src/app/onboarding/page.tsx` — kompletter Mobile-Flow
- `src/app/(app)/home/page.tsx` — Widgets, Skeleton, Performance
- `src/lib/onboarding-options.ts` — Welcome-Features, Simple Goals/Activity
- `src/lib/validations.ts` — `name` im Onboarding-Schema
- `src/app/api/onboarding/route.ts` — Name speichern, `estimatedGoalWeeks`
- `src/hooks/use-profile-header.ts` — Cache-aware Fetch
- `src/lib/nav-cache-warmer.ts` — deferred Food-Search
- `src/components/home/home-insight-cards.tsx` — memo + Mobile-Touch
- `src/app/(app)/nutrition/page.tsx` — Nutrition-Search-Warming

---

## Build & Lint

```
npm run build  ✓ erfolgreich
npm run lint   ✓ 0 errors (29 bestehende warnings)
```

---

## Empfohlene nächste Schritte

1. `/api/home` in leichte + schwere Sektionen splitten (`?sections=core`)
2. Lighthouse-Messung im Browser durchführen
3. PWA / Service Worker für Offline-Skeleton
4. Chart-Komponenten lazy-loaden (`next/dynamic`)
