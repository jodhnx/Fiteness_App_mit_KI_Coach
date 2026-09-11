import { fetchCached, getCached, isCacheStale } from "@/lib/client-cache";
import { PROGRESS_CACHE_KEY } from "@/lib/progress-cache";

export const CACHE_KEYS = {
  PLANS_LIST: "workouts-my-plans-hub",
  JOURNEY: "workouts-journey-full",
  PROGRESS: PROGRESS_CACHE_KEY,
} as const;

const TTL = {
  JOURNEY: 90_000,
  PROGRESS: 180_000,
} as const;

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url, { credentials: "same-origin" });
  if (!res.ok) throw new Error(`fetch ${url}`);
  return res.json() as Promise<T>;
}

/**
 * Secondary training warm — journey only.
 * Plans + active session are owned by warmNavDataCaches (same cache keys / dedup).
 */
export function warmTrainingCaches(force = false) {
  if (typeof window === "undefined") return;

  if (force || isCacheStale(CACHE_KEYS.JOURNEY, 0.9)) {
    void fetchCached(
      CACHE_KEYS.JOURNEY,
      () => fetchJson("/api/workouts/journey"),
      TTL.JOURNEY
    ).catch(() => {});
  }
}

export function getCachedPlanList<T>(): T | null {
  return getCached<T>(CACHE_KEYS.PLANS_LIST);
}

export function getCachedJourney<T>(): T | null {
  return getCached<T>(CACHE_KEYS.JOURNEY);
}
