# NEXFORM Companion (Expo)

Mobile companion for the NEXFORM web app. Shares the same backend — **no second API server**.

## Setup

1. Set `extra.apiBaseUrl` in `app.json` (or `EXPO_PUBLIC_API_BASE`) to your deployed NEXFORM origin.
2. From this folder: `npm install` then `npx expo start`.
3. Auth uses email/password against `POST /api/auth/callback/credentials` (same Auth.js backend). Cookie/session forwarding on native may require a dedicated mobile token endpoint — document and implement before production.

## Implemented screens (scaffold)

- Login
- Home (calories/macros from `/api/home` or nutrition dashboard)
- Nutrition quick-add + barcode camera entry point
- Workouts list entry
- Progress weight entry
- Coach chat entry
- Devices / wearables status (`/api/wearables`) + health ingest helper

## HealthKit / Health Connect

Browser cannot read these. Companion must:

1. Request permissions (native modules in a **dev client / EAS build**).
2. Map samples → `NativeIngestPayload` (`src/lib/health/native-bridge.ts` in the web repo).
3. `POST {apiBaseUrl}/api/health/ingest` with the user session.

Until a native health module is linked and credentials exist, the UI must show **not synced**, never fake steps/HR.

## Offline

Active workout drafts can be stored in AsyncStorage and flushed when online — hook into existing workout session APIs without creating duplicate sessions (use client-generated idempotency keys when available).
