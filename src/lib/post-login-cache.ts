import { bindCacheOwner } from "@/lib/client-cache";
import {
  applyBootstrapPayload,
  fetchBootstrapShared,
} from "@/lib/app-init";

/**
 * Start /api/bootstrap immediately after login.
 * Does NOT wipe caches (caller already did) and shares inflight with initializeApp.
 */
export function warmPostLoginCaches(userId?: string | null): void {
  if (typeof window === "undefined") return;
  if (userId) bindCacheOwner(userId);

  void fetchBootstrapShared()
    .then((fresh) => {
      if (!fresh) return;
      if (userId) bindCacheOwner(userId);
      applyBootstrapPayload(fresh);
      void import("@/lib/food-history-cache").then((m) =>
        m.warmFoodHistoryCache(true)
      );
    })
    .catch(() => undefined);
}
