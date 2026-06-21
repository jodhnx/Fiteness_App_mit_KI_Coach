import { fetchCached, getCached, isCacheStale } from "@/lib/client-cache";
import { PROGRESS_CACHE_KEY } from "@/lib/progress-cache";
import { PROFILE_CACHE_KEY } from "@/lib/nutrition-sync";

let warmed = false;

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url, { credentials: "same-origin" });
  if (!res.ok) throw new Error(`Warm ${url} failed`);
  return res.json() as Promise<T>;
}

/** Background prefetch for instant tab switches — skips work when cache is fresh. */
export function warmNavDataCaches() {
  if (warmed || typeof window === "undefined") return;
  warmed = true;

  const idle =
    typeof requestIdleCallback !== "undefined"
      ? requestIdleCallback
      : (cb: () => void) => setTimeout(cb, 1500);

  idle(() => {
    if (isCacheStale(PROGRESS_CACHE_KEY, 0.85)) {
      void fetchCached(
        PROGRESS_CACHE_KEY,
        () => fetchJson("/api/progress"),
        180_000
      ).catch(() => {});
    }

    if (isCacheStale(PROFILE_CACHE_KEY, 0.5)) {
      void fetchCached(
        PROFILE_CACHE_KEY,
        () => fetchJson("/api/profile"),
        120_000
      ).catch(() => {});
    }

    if (isCacheStale("gamification-full", 0.85)) {
      void fetchCached(
        "gamification-full",
        () => fetchJson("/api/gamification"),
        120_000
      ).catch(() => {});
    }
  });
}

/** Warm food search only when user opens nutrition (avoids 4 API calls on app start). */
export function warmNutritionSearchCaches() {
  if (typeof window === "undefined") return;
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
