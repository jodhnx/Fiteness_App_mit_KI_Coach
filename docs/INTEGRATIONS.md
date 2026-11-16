# NEXFORM Integrations — Credentials & Status

**Do not put secrets in this file.** Configure via server environment only (never commit `.env` / `.env.local`).

## Nutrition

| Feature | Status | Required env | Notes |
|---|---|---|---|
| Barcode (Open Food Facts) | Works without key | — | Public OFF API; AT + world product endpoints; server cache + DB upsert |
| Food search (OFF) | Works without key | — | Search-a-licious + legacy CGI fallback |
| Foto-KI | Needs key | `OPENAI_API_KEY`, optional `OPENAI_VISION_MODEL` | Without key: empty result + manual add (no fake analysis) |
| Local food DB | Works | `DATABASE_URL` | Seed: `npm run db:seed:foods` (~21k catalog + AT staples) |

## Wearables / Health (OAuth)

| Provider | Status | Required env | Notes |
|---|---|---|---|
| Fitbit | Ready when configured | `FITBIT_CLIENT_ID`, `FITBIT_CLIENT_SECRET` | Web OAuth + sync |
| Garmin | Ready when configured | `GARMIN_CLIENT_ID`, `GARMIN_CLIENT_SECRET` | Partner API access usually required from Garmin |
| Google Fit | Ready when configured | `GOOGLE_FIT_CLIENT_ID/SECRET` or `AUTH_GOOGLE_ID/SECRET` | |
| Polar | Ready when configured | `POLAR_CLIENT_ID`, `POLAR_CLIENT_SECRET` | |
| COROS | Ready when configured | `COROS_CLIENT_ID`, `COROS_CLIENT_SECRET` | |
| Suunto | Ready when configured | `SUUNTO_CLIENT_ID`, `SUUNTO_CLIENT_SECRET`, `SUUNTO_SUBSCRIPTION_KEY` | |
| Strava | Not in schema yet | — | Needs `WearableProvider.STRAVA` migration + OAuth app; not faked |
| Apple Health | Companion bridge | — | HealthKit via native companion → `POST /api/health/ingest` |
| Health Connect | Companion bridge | — | Android companion → same ingest API |

Also needed for OAuth callbacks: `NEXT_PUBLIC_APP_URL` / `AUTH_URL`, `AUTH_SECRET`.

## Companion App

Path: `apps/companion` (Expo + TypeScript).

- Reuses NEXFORM backend APIs (cookie/session or bearer — see companion README).
- HealthKit / Health Connect require a **dev build** (not Expo Go alone for full native health).
- Without companion, native wearables stay `pending_companion` — UI must not claim “connected with data”.

## Double-counting calories

Exercise kcal for nutrition “remaining” comes from `getTodayExerciseBurn` (steps + endurance + strength). Wearable day metrics are stored separately; do not add raw `activeCalories` on top of already imported endurance activities with the same external id.

## Recipes

- Catalog is TypeScript modules under `src/data/recipes` (300+ original NEXFORM templates).
- Personalize: `GET /api/recipes/catalog?personalize=1&remainCal=&remainProtein=&goal=`
