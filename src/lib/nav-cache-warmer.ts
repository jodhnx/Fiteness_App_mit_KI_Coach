import { fetchCached, getCached, isCacheStale } from "@/lib/client-cache";
import { PROGRESS_CACHE_KEY } from "@/lib/progress-cache";
import { prefetchProgressCharts } from "@/lib/progress-chart-prefetch";
import {
  PROFILE_CACHE_KEY,
  HOME_DATA_CACHE_KEY,
  NUTRITION_DASHBOARD_CACHE_KEY,
} from "@/lib/nutrition-sync";
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

  if (isCacheStale(HOME_DATA_CACHE_KEY, 0.88)) {
    void fetchCached(
      HOME_DATA_CACHE_KEY,
      () => fetchJson("/api/home"),
      120_000
    ).catch(() => {});
  }

  if (isCacheStale(NUTRITION_DASHBOARD_CACHE_KEY, 0.85)) {
    void fetchCached(
      NUTRITION_DASHBOARD_CACHE_KEY,
      () => fetchJson("/api/nutrition/dashboard"),
      120_000
    ).catch(() => {});
  }

  if (isCacheStale(PROFILE_CACHE_KEY, 0.92)) {
    void fetchCached(
      PROFILE_CACHE_KEY,
      () => fetchJson("/api/profile"),
      120_000
    ).catch(() => {});
  }

  warmProgressCache();

  const idle =
    typeof requestIdleCallback !== "undefined"
      ? requestIdleCallback
      : (cb: () => void) => setTimeout(cb, 800);

  idle(() => {
    if (isCacheStale("gamification-full", 0.85)) {
      void fetchCached(
        "gamification-full",
        () => fetchJson("/api/gamification"),
        120_000
      ).catch(() => {});
    }
  });
}

/** Warm food search + history when user opens nutrition (instant + button). */
export function warmNutritionSearchCaches() {
  if (typeof window === "undefined") return;
  warmFoodHistoryCache();

  const idle =
    typeof requestIdleCallback !== "undefined"
      ? requestIdleCallback
      : (cb: () => void) => setTimeout(cb, 100);

  idle(() => {
    if (getCached("food-search:banane")) return;
    for (const term of ["banane", "haferflocken"]) {
      void fetchCached(
        `food-search:${term}`,
        () => fetchJson(`/api/food/search?q=${encodeURIComponent(term)}&localOnly=1`),
        300_000
      ).catch(() => {});
    }
  });
}
