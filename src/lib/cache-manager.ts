import { fetchCached, getCached, isCacheStale } from "@/lib/client-cache";
import { PROGRESS_CACHE_KEY } from "@/lib/progress-cache";

export const CACHE_KEYS = {
  PLANS_LIST: "workouts-my-plans-list",
  JOURNEY: "workouts-journey-full",
  PROGRESS: PROGRESS_CACHE_KEY,
} as const;

const TTL = {
  PLANS: 120_000,
  JOURNEY: 90_000,
  PROGRESS: 180_000,
} as const;

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url, { credentials: "same-origin" });
  if (!res.ok) throw new Error(`fetch ${url}`);
  return res.json() as Promise<T>;
}

/** Parallel prefetch — plans, journey, progress (no sequential waits) */
export function warmTrainingCaches(force = false) {
  if (typeof window === "undefined") return;

  const jobs: Promise<unknown>[] = [];

  if (force || isCacheStale(CACHE_KEYS.PLANS_LIST, 0.9)) {
    jobs.push(
      fetchCached(CACHE_KEYS.PLANS_LIST, () => fetchJson("/api/workouts/plans"), TTL.PLANS)
    );
  }
  if (force || isCacheStale(CACHE_KEYS.JOURNEY, 0.9)) {
    jobs.push(
      fetchCached(CACHE_KEYS.JOURNEY, () => fetchJson("/api/workouts/journey"), TTL.JOURNEY)
    );
  }

  void Promise.all(jobs).catch(() => {});
}

export function getCachedPlanList<T>(): T | null {
  return getCached<T>(CACHE_KEYS.PLANS_LIST);
}

export function getCachedJourney<T>(): T | null {
  return getCached<T>(CACHE_KEYS.JOURNEY);
}
