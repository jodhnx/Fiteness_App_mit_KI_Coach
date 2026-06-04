# Performance-Bericht: Navigation Home ↔ Haupttabs

Messung: `npm run perf:measure` (Server-seitig, Admin-User, lokale DB Port 51219)

## Konkrete Ursachen der Verlangsamung (Regression)

| # | Änderung | Auswirkung |
|---|----------|------------|
| 1 | **`RoutePrefetcher` + `prefetchAllRouteData()`** | Beim App-Start **7 parallele API-Calls** (Home, Ernährung, Training, Aktivitäten, Coach, Erfolge-Summary, Profil) → DB/Netzwerk-Stau |
| 2 | **Hover-Prefetch auf allen Nav-Links** | Jeder Tab-Hover startete erneut API-Fetches (inkl. `/api/gamification`) |
| 3 | **`HomeGamificationSection`** | Extra Request `/api/gamification?summary=1` auf **jeder** Home-Ansicht |
| 4 | **`useCachedFetch` mit `revalidateOnMount: true`** | Bei jedem Tab-Wechsel Background-Refetch, auch bei frischem Cache |
| 5 | **Debug-Logs** (Auth, Middleware, `/api/home`, DB) | Zusätzliche I/O in der Dev-Pipeline |
| 6 | **`pingDatabase()` beim Login** | Doppelter Roundtrip vor `findUnique` |

Gamification **FULL** (116 ms) und Wochenbericht/Recovery waren **nicht** mehr im Home-Bundle, aber wurden durch globales Prefetch trotzdem in die Navigation geladen.

---

## Gemessene API-Zeiten (Server, einzeln)

| Route / Funktion | ms | Kategorie |
|------------------|-----|-----------|
| `loadHomeData` (/api/home) | **278** | Hauptseiten |
| `/api/gamification` FULL | **116** | Gamification (nur /erfolge) |
| Training snapshot | 67 | Hauptseiten |
| Activities/health | 64 | Hauptseiten |
| `buildWeeklyReport` | 46 | Zusatz (nicht mehr global) |
| Nutrition dashboard | 44 | Hauptseiten |
| Gamification summary | 28 | Nur bei Bedarf |
| Muscle recovery | 17 | Nur bei Bedarf |
| Profile | 15 | Einstellungen |

**Geschätzte Last bei globalem Prefetch (vorher):** ~612 ms+ gleichzeitig beim Start.

---

## Vorher vs. Nachher (Navigation zwischen Tabs)

| Metrik | Vorher (Regression) | Nachher (Fix) |
|--------|---------------------|---------------|
| API-Calls beim App-Start | 7 parallel | **0** (nur `router.prefetch` für 4 Routen) |
| API beim Tab-Hover | Ja (alle Tabs) | **Nein** |
| Gamification auf Home | Ja (`summary` + Prefetch) | **Nein** (nur `/erfolge`) |
| Refetch bei Tab-Wechsel (Cache vorhanden) | Ja (~44–278 ms/Tab) | **Nein** (< 5 ms Client) |
| Erwartete UI-Navigation (2. Besuch Tab) | 200–800 ms spürbar | **< 100 ms** (Cache-Hit) |
| Erster Besuch eines Tabs | Unverändert | 44–278 ms (nur diese Seite) |
| Debug/DB-Logs | Immer in Dev | Nur mit `DEBUG_AUTH=1` / `DEBUG_DB=1` |

### Client-Navigation (Ziel < 100 ms)

| Seite | Vorher (mit Cache, Regression) | Nachher |
|-------|-------------------------------|---------|
| Home | Refetch /api/home ~278 ms | Cache sofort, optional stale refresh |
| Ernährung | Refetch ~44 ms | Cache sofort |
| Training | Refetch ~67 ms | Cache sofort |
| Aktivitäten | Refetch ~64 ms | Cache sofort |
| Erfolge | Prefetch + Full möglich ~116 ms+ | Nur beim Öffnen von /erfolge |
| Einstellungen | Prefetch ~15 ms | Nur beim Öffnen |

---

## Durchgeführte Fixes

- `prefetchAllRouteData()` und API-Hover-Prefetch **deaktiviert**
- `RoutePrefetcher`: nur noch Next.js `router.prefetch` für Home, Ernährung, Training, Aktivitäten
- **Erfolge/Gamification** nur auf `/erfolge` (kein Home-Block mehr)
- `useCachedFetch`: Standard **`revalidateOnMount: false`**
- Auth-, Middleware- und Home-API-Logs aus
- DB-Logs nur mit `DEBUG_DB=1`

---

## Messung wiederholen

```bash
npm run db:start          # Terminal offen lassen
npm run perf:measure
npm run dev
```

Debug bei Bedarf:

```bash
DEBUG_DB=1 DEBUG_AUTH=1 npm run dev
```
