/**
 * Health Connect / HealthKit / Samsung / Huawei / Wear OS
 * Native companion apps POST snapshots to /api/health/ingest.
 * This module documents the bridge contract and validates payloads client-side.
 */

import type { WearableProvider } from "@prisma/client";
import type { HealthDaySnapshot, WearableWorkoutSnapshot } from "@/lib/health/types";

export const NATIVE_BRIDGE_DOCS: Record<
  string,
  { platform: string; sdk: string; note: string }
> = {
  APPLE_HEALTH: {
    platform: "iOS",
    sdk: "HealthKit (HKHealthStore)",
    note: "Read steps, workouts, sleep, HR, SpO₂ after user authorization; POST to /api/health/ingest",
  },
  GOOGLE_HEALTH_CONNECT: {
    platform: "Android",
    sdk: "Health Connect",
    note: "Preferred Android hub — aggregates Fitbit/Garmin/Samsung when permitted",
  },
  SAMSUNG_HEALTH: {
    platform: "Android",
    sdk: "Samsung Health Data SDK",
    note: "Prefer Health Connect on Android 14+; fallback Samsung SDK",
  },
  HUAWEI_HEALTH: {
    platform: "Android / HarmonyOS",
    sdk: "Huawei Health Kit",
    note: "Bridge via companion; ingest same payload schema",
  },
  WEAR_OS: {
    platform: "Wear OS",
    sdk: "Health Connect + Wearable Data Layer",
    note: "Route through Health Connect when available",
  },
};

export type NativeIngestPayload = {
  provider: WearableProvider;
  days?: HealthDaySnapshot[];
  workouts?: WearableWorkoutSnapshot[];
  device?: {
    name?: string;
    manufacturer?: string;
    batteryLevel?: number;
  };
};

/** Client helper for companion apps / Capacitor plugins. */
export async function postNativeHealthIngest(payload: NativeIngestPayload) {
  const res = await fetch("/api/health/ingest", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "same-origin",
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.error ?? "Ingest fehlgeschlagen");
  }
  return res.json();
}
