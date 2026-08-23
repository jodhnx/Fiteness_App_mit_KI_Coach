import { fetchCached, getCached, isCacheStale, setCached } from "@/lib/client-cache";
import type { FoodProduct } from "@/lib/food/food-product-types";

export const FOOD_HISTORY_CACHE_KEY = "food-history";

export type FoodHistoryPayload = {
  frequent: FoodProduct[];
  recents: FoodProduct[];
  favorites: FoodProduct[];
};

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url, { credentials: "same-origin" });
  if (!res.ok) throw new Error(`Warm ${url} failed`);
  return res.json() as Promise<T>;
}

function normalizeHistory(raw: {
  frequent?: FoodProduct[];
  recents?: FoodProduct[];
  favorites?: FoodProduct[];
}): FoodHistoryPayload {
  const rec = raw.recents ?? [];
  const frequent = (raw.frequent ?? rec).slice(0, 12);
  const favorites = (raw.favorites ?? []).slice(0, 24);
  return {
    frequent,
    recents: rec.slice(0, 12),
    favorites,
  };
}

/** Instant read for FoodAddPopup — no network (allows soft-stale overnight). */
export function getCachedFoodHistory(): FoodHistoryPayload | null {
  return getCached<FoodHistoryPayload>(FOOD_HISTORY_CACHE_KEY, {
    allowStale: true,
  });
}

/** Prefetch frequent / recent / favorites for instant + button. */
export function warmFoodHistoryCache(force = false) {
  if (typeof window === "undefined") return;
  if (!force && !isCacheStale(FOOD_HISTORY_CACHE_KEY, 0.7)) return;

  void fetchCached(
    FOOD_HISTORY_CACHE_KEY,
    async () => {
      const raw = await fetchJson<{
        frequent?: FoodProduct[];
        recents?: FoodProduct[];
        favorites?: FoodProduct[];
      }>("/api/food/history");
      return normalizeHistory(raw);
    },
    7 * 24 * 60 * 60_000
  ).catch(() => undefined);
}

/** Force refresh after adding food / toggling favorite. */
export function refreshFoodHistoryCache() {
  if (typeof window === "undefined") return;
  void fetch("/api/food/history", { credentials: "same-origin" })
    .then((r) => (r.ok ? r.json() : null))
    .then((raw) => {
      if (!raw) return;
      setCached(FOOD_HISTORY_CACHE_KEY, normalizeHistory(raw), 7 * 24 * 60 * 60_000);
    })
    .catch(() => undefined);
}
