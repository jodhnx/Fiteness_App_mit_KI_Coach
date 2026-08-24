import { setCached, bindCacheOwner } from "@/lib/client-cache";
import { clearAllUserClientState } from "@/lib/clear-user-client-state";
import { normalizeHomeData, type HomeDataPayload } from "@/lib/home-defaults";
import {
  isValidDashboardPayload,
  type NutritionDashboardPayload,
} from "@/lib/nutrition-defaults";
import {
  HOME_DATA_CACHE_KEY,
  PROFILE_CACHE_KEY,
  NUTRITION_DASHBOARD_CACHE_KEY,
  publishNutritionDashboard,
  HOME_DATA_EVENT,
} from "@/lib/nutrition-sync";
import { warmFoodHistoryCache } from "@/lib/food-history-cache";

/**
 * Clear previous account caches, then seed via /api/bootstrap
 * (home + nutrition + profile stub) instead of the full /api/home document.
 */
export function warmPostLoginCaches(userId?: string | null): void {
  if (typeof window === "undefined") return;

  clearAllUserClientState();
  if (userId) bindCacheOwner(userId);

  void fetch("/api/bootstrap", { credentials: "include" })
    .then((r) => (r.ok ? r.json() : null))
    .then((body) => {
      if (!body || typeof body !== "object") return;
      if (userId) bindCacheOwner(userId);

      const nutrition = (body as { nutrition?: NutritionDashboardPayload }).nutrition;
      if (nutrition && isValidDashboardPayload(nutrition)) {
        publishNutritionDashboard(nutrition);
        setCached(NUTRITION_DASHBOARD_CACHE_KEY, nutrition, 120_000);
      }

      const profile = (body as { profile?: unknown }).profile;
      if (profile) setCached(PROFILE_CACHE_KEY, profile, 120_000);

      const home = (body as { home?: HomeDataPayload }).home;
      if (home) {
        const normalized = normalizeHomeData(home);
        setCached(HOME_DATA_CACHE_KEY, normalized, 120_000);
        window.dispatchEvent(
          new CustomEvent(HOME_DATA_EVENT, { detail: normalized })
        );
      }

      warmFoodHistoryCache(true);
    })
    .catch(() => undefined);
}
