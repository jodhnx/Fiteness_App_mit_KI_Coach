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
 * Does NOT wipe caches on a brief session flicker during soft navigation
 * (that caused shell crashes / "Unerwarteter Fehler").
 */
export function SessionCacheGuard() {
  const { data: session, status } = useSession();
  const lastUserId = useRef<string | null>(null);
  const warmedFor = useRef<string | null>(null);
  const clearTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (status === "loading") return;

    const userId = session?.user?.id ?? null;

    if (!userId) {
      // Debounce logout wipe — ignore transient null during nav/refetch
      if (clearTimer.current) clearTimeout(clearTimer.current);
      clearTimer.current = setTimeout(() => {
        if (lastUserId.current || getCacheOwner()) {
          clearAllUserClientState();
        }
        lastUserId.current = null;
        warmedFor.current = null;
      }, 800);
      return () => {
        if (clearTimer.current) clearTimeout(clearTimer.current);
      };
    }

    if (clearTimer.current) {
      clearTimeout(clearTimer.current);
      clearTimer.current = null;
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
