"use client";

import { useEffect, useRef } from "react";
import { useSession } from "next-auth/react";
import {
  bindCacheOwner,
  hydratePersistentCaches,
  getCacheOwner,
} from "@/lib/client-cache";
import { clearAllUserClientState } from "@/lib/clear-user-client-state";
import { warmNavDataCaches } from "@/lib/nav-cache-warmer";
import { warmFoodHistoryCache } from "@/lib/food-history-cache";

/**
 * Ensures client caches belong to the authenticated user.
 * Clears all client state on user change / logout so A→B never flashes.
 */
export function SessionCacheGuard() {
  const { data: session, status } = useSession();
  const lastUserId = useRef<string | null>(null);
  const warmedFor = useRef<string | null>(null);

  useEffect(() => {
    if (status === "loading") return;

    const userId = session?.user?.id ?? null;

    if (!userId) {
      if (lastUserId.current || getCacheOwner()) {
        clearAllUserClientState();
      }
      lastUserId.current = null;
      warmedFor.current = null;
      return;
    }

    const owner = getCacheOwner();
    const switched =
      (lastUserId.current != null && lastUserId.current !== userId) ||
      (owner != null && owner !== userId);

    if (switched) {
      clearAllUserClientState();
    }

    bindCacheOwner(userId);
    hydratePersistentCaches(userId);
    lastUserId.current = userId;

    if (warmedFor.current !== userId) {
      warmedFor.current = userId;
      warmNavDataCaches();
      warmFoodHistoryCache();
    }
  }, [session?.user?.id, status]);

  return null;
}
