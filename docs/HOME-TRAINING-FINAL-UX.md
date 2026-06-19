# Home + Training Final UX Update

Stand: Juni 2026 · `npm run build` erfolgreich

---

## Home Verbesserungen

### Kompakter Header (~52px)
- Neuer `HomeCompactHeader` ersetzt den großen globalen Header **nur auf `/home`**
- Layout: **Profilbild links** · **Guten Morgen/Mittag/Abend + Name** · **Glocke rechts**
- Kein doppelter Header mehr im Seiteninhalt
- Streak & Level als kompakte Chips direkt unter der Leiste (nicht im Header)

### Inhaltsstruktur (mehr Info, weniger Leerraum)
1. **Streak / Level** — kompakte Badges
2. **Aktives Training** — Schnelllink „Jetzt fortsetzen“ (wenn Session läuft)
3. **Heutiger Fortschritt** — große Karte: Kalorien übrig + 2×2 Grid (Protein, Wasser, Schritte, Kalorien)
4. **Nächstes Training** — geplant oder Empfehlung
5. **Wochenfortschritt** (neu) — Trainings, Kalorienziel, Gewichtstrend
6. **KI Coach Empfehlung**

### Entfernt von Home
- `HomeHeaderBar` (zu groß, doppelt)
- `MuscleRecoveryPanel` (nur noch auf Training-Seite)
- `HomeLoadingSkeleton` — Seite rendert sofort mit Cache/Leerdaten

### Neue Komponenten
- `home-compact-header.tsx`
- `home-week-progress-card.tsx`

---

## Trainingsverbesserungen

### Neue Reihenfolge (flache Liste, keine Sektionen)
1. Meine Pläne
2. Vorgefertigte Pläne
3. Quick Workout
4. Fitness Journey
5. Rekorde
6. Übungen
7. **Muskel-Regeneration** (ganz unten)

### Muskel-Regeneration — modernes Design
- `variant="section"`: Gradient-Karte, dickere Balken (2.5px), Gradient-Fills
- Prozentwerte prominent rechts
- Eigener Bereich am Seitenende

### Entfernt von Training
- `PageHeader` („Training“ + Untertitel) — keine doppelte Navigation
- Sektions-Labels „Trainieren“ / „Mehr“
- Regeneration oben (war vor den Karten)

Aktive Session bleibt oben als Fortsetzen-Karte.

---

## Performance Optimierungen

| Seite | Änderung |
|-------|----------|
| **Home** | Kein Skeleton — sofortiger Render aus Cache + Nutrition-Prefetch |
| **Fortschritt** | `ProgressPageSkeleton` entfernt — sofortiger Render mit Cache |
| **Coach** | `animate-pulse` beim „Coach schreibt…“ entfernt |
| **Ernährung** | Bereits optimistic (unverändert, weiterhin instant) |
| **Training** | Cache-first (`revalidateOnMount: false`), keine Ladeanimation |

### Cache-Strategie
- Home: `HOME_DATA_CACHE_KEY` + SSR Nutrition Prefetch
- Training: separate Hub-Caches (sessions, plans, journey, recovery)
- Hintergrund-Refresh via `requestIdleCallback` ohne UI-Block

---

## Entfernte Elemente

- Home: großer Header mit Avatar + Streak + Level im Content
- Home: Muskel-Regeneration
- Home: Loading-Skeleton
- Training: PageHeader
- Training: „Trainieren“ / „Mehr“ Gruppierung
- Training: Regeneration oben
- Fortschritt: Full-Page Skeleton

---

## Behobene Bugs

- Doppelter Header auf Home (Shell + `HomeHeaderBar`)
- Syntax-Fehler in `home-week-progress-card.tsx` und `progress/page.tsx` nach Skeleton-Entfernung
- Fehlende Imports auf `home/page.tsx` nach Refactor

---

## Build

```bash
npm run build
```

Ergebnis: ✓ Compiled successfully · keine TypeScript-Fehler
