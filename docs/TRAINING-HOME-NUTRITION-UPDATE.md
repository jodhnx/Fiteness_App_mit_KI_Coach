# Training · Home · Ernährung · Account Update

Stand: Juni 2026 · `npm run build` erfolgreich

---

## Muskel-Regeneration (neu)

### Berechnung
- Pro Muskelgruppe (Brust, Rücken, Schultern, Bizeps, Trizeps, Beine, Bauch)
- Faktoren: letzter Trainingszeitpunkt, Sätze der letzten Session, Volumen, Intensität (RPE)
- Basis-Erholungszeiten pro Muskel (z. B. Beine 72h, Bauch 24h)
- Penalties für hohes Volumen / viele Sätze verlängern die benötigte Erholungszeit
- Live-Aktualisierung clientseitig alle 60 Sekunden (`liveRecoveryPercent`)

### UI
- **`MuscleRecoveryPanel`**: Balken + Block-Darstellung (`██████████ 100%`)
- **Training-Hub** (`/workouts`): Panel direkt unter aktiver Session
- **Home** (`/home`): kompaktes Panel mit Link zu Journey

### API & Lib
- `GET /api/workouts/recovery`
- `src/lib/recovery-shared.ts` — client-sichere Hilfsfunktionen
- `src/lib/recovery-service.ts` — Server-Berechnung aus abgeschlossenen Sessions

---

## Home Screen (überarbeitet)

Minimalistisch, training-fokussiert — orientiert an Hevy / Strong / Apple Fitness.

### Struktur (von oben nach unten)
1. **Header** — Begrüßung, Profilbild (→ Account), Streak, Level
2. **Heutiger Fortschritt** — große Karte: Kalorien übrig, Protein, Schritte, Wasser
3. **Nächstes Training** — geplantes Training mit Start-Button oder KI-Empfehlung + Quick Workout
4. **Muskel-Regeneration** — 7 Regenerationsbalken
5. **KI Empfehlung** — kurzer Coach-Tipp

### Entfernt von Home
- Dashboard-Grid, Insight-Cards, Wochenübersicht, Challenges, Body-Card, Achievements, Quick Actions, Kalorien-Trend, Gewichtsziel, Motivation, geplante Workouts-Liste

### Neue Komponenten
- `home-header-bar.tsx`
- `home-today-progress-card.tsx`
- `home-next-training-card.tsx`
- `home-ki-tip-card.tsx`

---

## Ernährung — Performance

### Optimistic Updates
- **`use-food-quick-add.ts`**: Sofort UI-Update via `optimisticAddMealItem`, API-Sync im Hintergrund
- Rollback bei Fehler auf Snapshot
- `onSuccess` sofort nach optimistischem Update (Home synchron via `NUTRITION_DASHBOARD_EVENT`)

### Kein Spinner mehr beim Quick-Add
- `food-add-popup.tsx`, `product-search-panel.tsx`, `add-food-sheet.tsx`
- `quickAdding`-State entfernt — Klick auf „+“ wirkt instant

---

## Account (Profil + Einstellungen vereint)

### Entfernt
- Separates **Profil**-Menü in Sidebar, Header-Link und Primary-Nav
- `/profile` → Redirect nach `/settings`

### Umbenannt
- Navigationspunkt: **Account** (statt doppelt Profil + Einstellungen)
- Seiten-Titel: **Account** (bestehende Settings-GUI unverändert)

Enthält weiterhin: Profilbild, Name, Alter, Größe, Gewicht, Ziele, Aktivität, Support, Datenschutz, Konto.

---

## Performance

| Bereich | Maßnahme |
|---------|----------|
| Ernährung | Optimistic UI, Hintergrund-Sync, kein Blocking-Await |
| Home | Weniger Widgets, kleinere Bundle-Größe (~9.6 kB) |
| Recovery | Client-Tick ohne API-Polling, Cache 120s |
| Navigation | `/profile` aus Prefetch-Liste, Avatar → `/settings` |

---

## Behobene Bugs / Tech Debt

- `liveRecoveryPercent` / `filterDisplayMuscles` in `recovery-shared.ts` ausgelagert — kein Prisma-Import in Client-Komponenten
- TypeScript: `onQuickAddFood` Signatur auf synchrones `void` für instant UX
- Korrupte `product-search-panel.tsx` wiederhergestellt
- `sidebar-nav.tsx` Import-Fix (TrendingUp, Shield)

---

## Build

```bash
npm run build
```

Ergebnis: ✓ Compiled successfully · 101 Seiten · keine TypeScript-Fehler
