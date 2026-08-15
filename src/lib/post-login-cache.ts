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
 * Clear previous account caches, then seed the new user's data.
 * Fire-and-forget while navigating to /home after login.
 */
export function warmPostLoginCaches(userId?: string | null): void {
  if (typeof window === "undefined") return;

  clearAllUserClientState();
  if (userId) bindCacheOwner(userId);

  void Promise.all([
    fetch("/api/nutrition/dashboard", { credentials: "include" }).then((r) =>
      r.ok ? (r.json() as Promise<NutritionDashboardPayload>) : null
    ),
    fetch("/api/profile", { credentials: "include" }).then((r) =>
      r.ok ? r.json() : null
    ),
    fetch("/api/home", { credentials: "include" }).then((r) =>
      r.ok ? r.json() : null
    ),
  ])
    .then(([nutrition, profile, home]) => {
      if (userId) bindCacheOwner(userId);
      if (nutrition && isValidDashboardPayload(nutrition)) {
        publishNutritionDashboard(nutrition);
        setCached(NUTRITION_DASHBOARD_CACHE_KEY, nutrition, 120_000);
      }
      if (profile) setCached(PROFILE_CACHE_KEY, profile, 120_000);
      if (home) {
        const normalized = normalizeHomeData(home as HomeDataPayload);
        setCached(HOME_DATA_CACHE_KEY, normalized, 120_000);
        window.dispatchEvent(
          new CustomEvent(HOME_DATA_EVENT, { detail: normalized })
        );
      }
      warmFoodHistoryCache(true);
    })
    .catch(() => undefined);
}
