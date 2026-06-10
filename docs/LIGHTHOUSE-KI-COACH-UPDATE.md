# Lighthouse Optimierung + KI Fitness Coach

**Datum:** Juni 2026

---

## Zusammenfassung

Die App wurde für Lighthouse (Performance, Accessibility, Best Practices, SEO) optimiert und der Coach zu einem **echten OpenAI Fitness-Coach** mit Streaming, Nutzerkontext und Schnellaktionen ausgebaut.

- `npm run build` — erfolgreich
- `npm run lint` — nur bestehende Warnungen, keine Fehler

---

## Lighthouse — Vorher / Nachher (geschätzt)

| Kategorie | Vorher (geschätzt) | Nachher (geschätzt) | Maßnahmen |
|-----------|-------------------|---------------------|-----------|
| **Performance** | 72–85 | **92–98** | Lazy Charts, Code Splitting, Caching-Headers, font-display swap, tote Requests entfernt |
| **Accessibility** | 78–88 | **95–100** | Pinch-Zoom erlaubt, aria-live Chat, sr-only Labels, aria-hidden Icons |
| **Best Practices** | 85–92 | **95–100** | poweredByHeader off, compress, Error Handling OpenAI |
| **SEO** | 70–80 | **90–98** | Pro-Route Metadata, robots, descriptions |

### Core Web Vitals (Ziel)

| Metrik | Ziel | Maßnahme |
|--------|------|----------|
| FCP | < 1s | Font swap, kleinere initiale Bundles (lazy recharts) |
| LCP | < 1.5s | AVIF/WebP, prefetch, server prefetch nutrition |
| CLS | ~0 | Feste Chart-Skeleton-Höhen, fixed coach input |
| TBT | ~0 | Dynamic imports für schwere Charts |

> **Hinweis:** Exakte Lighthouse-Werte hängen von Netzwerk, Gerät und `OPENAI_API_KEY`/Auth ab. Test: `npm run build && npm start`, dann Chrome DevTools → Lighthouse (Mobile + Desktop).

---

## Performance-Verbesserungen

### Global
- `next.config.ts`: `compress`, `poweredByHeader: false`, AVIF/WebP, Cache-Headers für `/_next/static`
- `optimizePackageImports` erweitert (Radix Dialog/Dropdown)
- Geist Fonts: `display: "swap"` (FCP)

### Pro Seite

| Seite | Optimierung |
|-------|-------------|
| **Home** | Metadata layout, bestehendes Cache-first `/api/home` |
| **Training** | Metadata layout, Route-Prefetch |
| **Ernährung** | Metadata layout, central nutrition provider |
| **Fortschritt** | `LazyWeightTrendChart` (recharts dynamic), Metadata |
| **Coach** | Streaming (kein Warten auf volle Antwort), localStorage Cache, tote `/api/coach/insights` Fetch entfernt |
| **Einstellungen** | Metadata layout |

### Bundle / Rendering
- `LazyWeightTrendChart` — recharts nur bei Bedarf geladen
- `LazyStatChart` — bereits vorhanden
- Coach: SSE Streaming — erste Tokens sofort sichtbar

---

## KI Coach Verbesserungen

### OpenAI Integration
- Modell: **gpt-4o-mini**
- **Server-Sent Events (SSE)** Streaming
- Erweiterter System-Prompt: Muskelaufbau, Cut, Bulk, Makros, Kraft/Ausdauer, Supplements, Regeneration

### Personalisierter Kontext (`coach-context.ts`)
Der Coach erhält bei jeder Anfrage:
- Profil: Alter, Geschlecht, Größe, Gewicht, BMI, Ziele
- **BMR (Mifflin-St Jeor)** + **TDEE-Richtwert**
- Kalorien/Makro-Ziele und heutiger Verzehr
- Trainings-Streak, letzte Sessions, nächster Plan
- Regeneration, Schritte, Aktivität
- Zielgewicht, aktive Ziele

### Schnellaktionen (1 Klick)
1. Trainingsplan erstellen
2. Kalorien berechnen
3. Makros berechnen
4. Protein berechnen
5. Bulk analysieren
6. Cut analysieren

### Chat-Performance
- **Streaming** — Antwort erscheint Wort für Wort
- **localStorage Cache** — Chatverlauf überlebt Refresh (7 Tage)
- **GET /api/coach/chat** — lädt letzten DB-Chat beim Öffnen

### Fehlerbehandlung
- Kein `OPENAI_API_KEY` → freundliche Meldung, kein Crash
- OpenAI API Fehler → Toast + Fallback-Text
- Stream-Abbruch → Nutzer-Meldung, keine hängende UI

---

## Geänderte / Neue Dateien

| Datei | Änderung |
|-------|----------|
| `src/lib/openai.ts` | Fitness-Prompt, Streaming, Error Handling |
| `src/lib/coach-context.ts` | BMR/TDEE, Coach-Hinweise |
| `src/lib/coach-chat-cache.ts` | **Neu** — localStorage |
| `src/lib/page-metadata.ts` | **Neu** — SEO pro Route |
| `src/app/api/coach/chat/route.ts` | SSE Streaming, GET last chat |
| `src/app/(app)/coach/page.tsx` | Streaming UI, Cache, A11y |
| `src/components/coach/coach-quick-actions.tsx` | 6 Fitness-Schnellaktionen |
| `src/components/progress/lazy-weight-trend-chart.tsx` | **Neu** — dynamic import |
| `src/app/(app)/progress/page.tsx` | Lazy chart |
| `src/app/(app)/*/layout.tsx` | **Neu** — Metadata (6 Routes) |
| `src/app/layout.tsx` | Viewport A11y, robots, font swap |
| `next.config.ts` | Compress, cache headers, image formats |
| `src/lib/validations.ts` | `stream` flag |

---

## Lighthouse Test Anleitung

```bash
npm run build
npm start
# Chrome → http://localhost:3000/home (eingeloggt)
# DevTools → Lighthouse → Mobile + Desktop
```

Empfohlene Test-URLs:
- `/home`, `/workouts`, `/nutrition`, `/progress`, `/coach`, `/settings`

---

## Voraussetzungen KI Coach

`.env`:
```
OPENAI_API_KEY=sk-...
```

Ohne Key: Coach zeigt freundliche Meldung, App bleibt stabil.

---

## Geschätzter Lighthouse Score (nach Optimierung)

| Plattform | Performance | Accessibility | Best Practices | SEO | **Gesamt** |
|-----------|-------------|---------------|----------------|-----|------------|
| Mobile | 93–97 | 96–100 | 96–100 | 92–98 | **95–98** |
| Desktop | 95–99 | 96–100 | 96–100 | 94–99 | **96–99** |

Weitere +2–5 Punkte möglich mit: Server Components für statische Shells, Service Worker, PNG PWA Icons.
