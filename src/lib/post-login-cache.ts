import { bindCacheOwner } from "@/lib/client-cache";
import {
  applyBootstrapPayload,
  fetchBootstrapShared,
} from "@/lib/app-init";

/**
 * Start /api/bootstrap after login. Fire-and-forget for returning users.
 * Shares inflight with initializeApp — no duplicate bootstrap.
 */
export function warmPostLoginCaches(userId?: string | null): void {
  void warmPostLoginCachesAsync(userId);
}

/**
 * Awaitable warm used after registration so Home paints with real targets.
 */
export async function warmPostLoginCachesAsync(
  userId?: string | null
): Promise<boolean> {
  if (typeof window === "undefined") return false;
  if (userId) bindCacheOwner(userId);

  try {
    const fresh = await fetchBootstrapShared();
    if (!fresh) return false;
    if (userId) bindCacheOwner(userId);
    applyBootstrapPayload(fresh);
    void import("@/lib/food-history-cache").then((m) =>
      m.warmFoodHistoryCache(true)
    );
    return true;
  } catch {
    return false;
  }
}
