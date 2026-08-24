import { fetchCached, isCacheStale } from "@/lib/client-cache";
import { PROGRESS_CACHE_KEY } from "@/lib/progress-cache";
import { prefetchProgressCharts } from "@/lib/progress-chart-prefetch";
import { warmFoodHistoryCache } from "@/lib/food-history-cache";

let warmed = false;

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url, { credentials: "same-origin" });
  if (!res.ok) throw new Error(`Warm ${url} failed`);
  return res.json() as Promise<T>;
}

/** Reset after logout / account switch so next user gets a fresh warm. */
export function resetNavCacheWarmer() {
  warmed = false;
}

/** Prefetch progress data — call on tab hover or app start. */
export function warmProgressCache() {
  if (typeof window === "undefined") return;
  if (!isCacheStale(PROGRESS_CACHE_KEY, 0.85)) return;
  void fetchCached(
    PROGRESS_CACHE_KEY,
    () => fetchJson("/api/progress"),
    180_000
  )
    .then(() => prefetchProgressCharts())
    .catch(() => {});
}

/** Background prefetch for instant tab switches — skips work when cache is fresh. */
export function warmNavDataCaches() {
  if (typeof window === "undefined") return;
  if (warmed) return;
  warmed = true;

  const idle =
    typeof requestIdleCallback !== "undefined"
      ? requestIdleCallback
      : (cb: () => void) => setTimeout(cb, 800);

  // Bootstrap already seeded home/nutrition/profile — don't refetch them here
  window.setTimeout(() => {
    idle(() => {
      if (isCacheStale("workouts-active", 0.9)) {
        void fetchCached(
          "workouts-active",
          () => fetchJson("/api/workouts/sessions?active=1"),
          90_000
        ).catch(() => {});
      }
      if (isCacheStale("workouts-my-plans-hub", 0.9)) {
        void fetchCached(
          "workouts-my-plans-hub",
          () => fetchJson("/api/workouts/plans"),
          120_000
        ).catch(() => {});
      }
    });
  }, 2000);
}

/** Warm food search + history when user opens nutrition (instant + button). */
export function warmNutritionSearchCaches() {
  if (typeof window === "undefined") return;
  warmFoodHistoryCache();
}
