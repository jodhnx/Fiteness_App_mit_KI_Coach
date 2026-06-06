# Fitness-App Update — Juni 2026 (Begrüßung, Einstellungen, Übungssuche, Performance)

## Status

| Prüfung | Ergebnis |
|---------|----------|
| `npm run build` | ✅ Erfolgreich |
| Personalisierte Begrüßung | ✅ Name aus Profil, Fallback „Willkommen zurück“ |
| Einstellungen Profilkarte | ✅ Alle Werte sichtbar, Bearbeiten-Modus |
| Übungssuche Trainingsplan | ✅ Auto-Seed + schnelleres Seeding |
| Seed-Problem | ✅ Automatisch bei leerer DB, kein npm-Hinweis mehr |
| Menü-Performance | ✅ Link-Prefetch + erweiterte Route-Prefetch |

---

## 1. Personalisierte Begrüßung

**Problem:** Home zeigte E-Mail-Prefix oder Platzhalter „Athlet“ statt des echten Namens.

**Ursache:** `displayName` nutzte `session.user.email` als Fallback; JWT enthält absichtlich keinen Namen (Cookie-Größe).

**Lösung:**

- Server-Prefetch des Namens im App-Layout (`loadProfilePrefetch`)
- `ProfileDataProvider` seedet `profile-data` Cache beim ersten Render
- `useDisplayName()` liest nur echten Namen (Prefetch → Cache → Home-API)
- `HomeGreeting`: mit Name → „Guten Morgen, Benni“; ohne Name → „Willkommen zurück“
- Kein E-Mail-Fallback mehr in Header und Home

---

## 2. Einstellungen — Persönliche Daten sichtbar

**Problem:** Felder nur als leere Inputs sichtbar.

**Lösung:**

- Neue Komponente `SettingsPersonalSummary` — übersichtliche Profilkarte mit:
  Name, Alter, Gewicht, Größe, Geschlecht, Aktivitätslevel, Zielgewicht, Ziel, Kalorienziel
- Standardansicht: alle Werte lesbar
- Button „Bearbeiten“ öffnet Formular; „Abbrechen“ / „Speichern“ schließt Bearbeitung
- Nach Speichern: Name auch im Home-Cache (`userName`) aktualisiert

---

## 3. Übungssuche — Root Cause & Fix

**Warum die Suche nicht funktionierte:**

1. **Leere Datenbank** auf Vercel/Neuinstallation — `ExerciseLibrary`-Tabelle ohne Einträge
2. **Zu langsames Seeding** — 395 einzelne `upsert()`-Aufrufe pro Übung → API-Timeout beim ersten Request
3. **Fehlende Retry-Logik** — Client zeigte leere Liste + Hinweis `npm run db:seed` statt automatischer Behebung

**Fix:**

- `exercise-seed-runtime.ts`: **Fast-Seed** mit `createMany` (100er-Batches) — ~4 DB-Queries statt 395
- `GET /api/exercises`: `maxDuration = 60`, tokenbasierte Suche, `libraryCount` + `seeded` in Response
- `useExerciseLibrarySearch`: `credentials: include`, Auto-Retry nach Seed, Status „Bibliothek wird initialisiert…“
- Plan-Editor: Equipment-Filter um `SMITH_MACHINE` / `NONE` ergänzt

**Datenbestand:** 395 Übungen in `exercise-library.ts` (Brust, Rücken, Beine, Schultern, Arme, Bauch, Cardio u. a.)

---

## 4. Seed-Problem (Erfolge & Übungen)

**Problem:** UI zeigte „Führe npm run db:seed aus“ ohne automatische Behebung.

**Lösung:**

- `achievement-seed-runtime.ts` — auto-seed 136 Erfolge + Level-Tabelle wenn DB leer
- `achievement-engine.ts` triggert Seed beim ersten Laden
- Erfolge-Seite: „Erfolge werden initialisiert…“ statt npm-Hinweis

### Manueller Seed (nur bei komplett frischer DB / lokaler Entwicklung)

| Schritt | Befehl | Wo | Warum | Danach |
|---------|--------|-----|-------|--------|
| 1 | `npm run db:seed` | Projektroot (`Fitness_App_mit_KI_Coach`) | Legt Admin, 395 Übungen, 136 Erfolge, Lebensmittel an | Übungssuche & Erfolge sofort vollständig |
| 2 | `npx prisma db push` | Projektroot | Nur wenn Schema geändert | Tabellen aktuell |

**In Produktion (Vercel):** Auto-Seed beim ersten API-Aufruf — kein manueller Schritt nötig.

---

## 5. Menü- & App-Performance

- **Bottom-Nav:** `router.push` → `<Link prefetch>` für sofortigen Seitenwechsel
- **RoutePrefetcher:** sofort `/home`, `/workouts`, `/nutrition`; idle `/progress`, `/erfolge`, `/settings`
- **Profil-Prefetch** parallel zu Nutrition-Prefetch im Layout (ein Round-Trip weniger für Begrüßung)
- Keine zusätzlichen API-Warmups beim Navigieren (verhindert DB-Stau)

---

## Geänderte Dateien

| Datei | Änderung |
|-------|----------|
| `src/components/home/home-greeting.tsx` | Willkommen zurück / echter Name |
| `src/hooks/use-display-name.ts` | Neu — Name ohne Platzhalter |
| `src/components/providers/profile-data-provider.tsx` | Neu — Profil-Prefetch |
| `src/lib/profile-prefetch.ts` | Neu — Server-Name laden |
| `src/app/(app)/layout.tsx` | Profil + Nutrition parallel prefetch |
| `src/hooks/use-profile-header.ts` | Kein E-Mail-Fallback |
| `src/app/(app)/home/page.tsx` | `useDisplayName` |
| `src/components/settings/settings-personal-summary.tsx` | Neu — Profilkarte |
| `src/app/(app)/settings/page.tsx` | View/Edit-Modus |
| `src/lib/exercise-seed-runtime.ts` | Fast createMany Seed |
| `src/lib/achievement-seed-runtime.ts` | Neu — Auto-Seed Erfolge |
| `src/lib/achievement-engine.ts` | Auto-Seed bei leerer DB |
| `src/app/api/exercises/route.ts` | maxDuration, token-Suche |
| `src/hooks/use-exercise-library-search.ts` | Retry, seeding-Status |
| `src/app/(app)/workouts/plans/[id]/page.tsx` | Bessere UI-Meldungen |
| `src/app/(app)/erfolge/page.tsx` | Kein npm-Hinweis |
| `src/components/layout/bottom-nav.tsx` | Link + prefetch |
| `src/components/layout/route-prefetcher.tsx` | Mehr Routen |

---

## Manuelle Tests

1. **Home:** Mit gesetztem Namen → „Guten Morgen, [Name]“; ohne Name → „Willkommen zurück“
2. **Einstellungen:** Profilkarte zeigt alle Werte; Bearbeiten → Speichern → Home-Name aktualisiert
3. **Trainingsplan:** Suche „Bankdrücken“ → Treffer → Hinzufügen → nach Reload vorhanden
4. **Erfolge:** Kein npm-Hinweis; Liste lädt (ggf. kurz „initialisiert…“)
5. **Navigation:** Tab-Wechsel Home ↔ Training ↔ Ernährung ohne spürbaren Delay
