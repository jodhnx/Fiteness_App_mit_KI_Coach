import { fetchCached, isCacheStale } from "@/lib/client-cache";
import { PROGRESS_CACHE_KEY } from "@/lib/progress-cache";
import { prefetchProgressCharts } from "@/lib/progress-chart-prefetch";
import { warmFoodHistoryCache } from "@/lib/food-history-cache";
import { WORKOUT_ACTIVE_CACHE_KEY } from "@/lib/workout-cache-sync";
import { warmActiveNutritionPlanCaches } from "@/lib/nutrition-plan-cache";

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

/**
 * Background prefetch for instant primary-tab switches.
 * Nutrition dashboard is owned by bootstrap — do not refetch here.
 */
export function warmNavDataCaches() {
  if (typeof window === "undefined") return;
  if (warmed) return;
  warmed = true;

  const idle =
    typeof requestIdleCallback !== "undefined"
      ? requestIdleCallback
      : (cb: () => void) => window.setTimeout(cb, 200);

  // ASAP after paint — plans + food history (Nutrition / Training first hops)
  idle(() => {
    warmActiveNutritionPlanCaches();
    warmFoodHistoryCache();
  });

  // Primary tabs: session + plans — shortly after first paint
  window.setTimeout(() => {
    idle(() => {
      if (isCacheStale(WORKOUT_ACTIVE_CACHE_KEY, 0.9)) {
        void fetchCached(
          WORKOUT_ACTIVE_CACHE_KEY,
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
  }, 350);

  // Secondary: recovery — later, not on critical path
  window.setTimeout(() => {
    idle(() => {
      if (isCacheStale("workouts-recovery", 0.9)) {
        void fetchCached(
          "workouts-recovery",
          () => fetchJson("/api/workouts/recovery"),
          90_000
        ).catch(() => {});
      }
    });
  }, 2800);
}

/** Warm food search + history when user opens nutrition (instant + button). */
export function warmNutritionSearchCaches() {
  if (typeof window === "undefined") return;
  warmFoodHistoryCache();
}

/** Low-priority social/gamification — only when More/Social likely; idle so More paints first. */
export function warmSecondarySocialCaches() {
  if (typeof window === "undefined") return;
  const idle =
    typeof requestIdleCallback !== "undefined"
      ? requestIdleCallback
      : (cb: () => void) => window.setTimeout(cb, 800);
  idle(() => {
    if (isCacheStale("gamification-full", 0.9)) {
      void fetchCached(
        "gamification-full",
        () => fetchJson("/api/gamification"),
        120_000
      ).catch(() => {});
    }
    if (isCacheStale("social-feed", 0.9)) {
      void fetchCached(
        "social-feed",
        () =>
          fetchJson<{ feed?: unknown[] }>("/api/social/feed").then(
            (d) => d.feed ?? []
          ),
        90_000
      ).catch(() => {});
    }
  });
}
