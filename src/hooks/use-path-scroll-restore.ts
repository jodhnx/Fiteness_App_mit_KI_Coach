"use client";

import { useEffect, useLayoutEffect, useRef } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import {
  applyWindowScrollY,
  buildScrollKeyNormalized,
  clearAllScrollPositions,
  clearScrollPosition,
  getWindowScrollY,
  restoreScrollPosition,
  saveScrollPosition,
} from "@/lib/scroll-restore";

/**
 * Persists window scroll per route (incl. settings ?view=) and restores on return.
 * Works with Keep-Alive main tabs and nested App Router pages.
 */
export function usePathScrollRestore() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const search = searchParams?.toString() ? `?${searchParams.toString()}` : "";
  const routeKey = buildScrollKeyNormalized(pathname, search);
  const prevKey = useRef<string | null>(null);
  const skipNextRestore = useRef(false);

  // Continuously remember scroll for the active route
  useEffect(() => {
    if (!routeKey) return;
    let ticking = false;
    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        ticking = false;
        saveScrollPosition(routeKey, getWindowScrollY());
      });
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [routeKey]);

  // Save previous route before key changes; restore new route before paint
  useLayoutEffect(() => {
    const prev = prevKey.current;
    if (prev && prev !== routeKey) {
      saveScrollPosition(prev, getWindowScrollY());
    }

    if (!routeKey) {
      prevKey.current = null;
      return;
    }

    // Same-tab re-tap sets this via custom event
    if (skipNextRestore.current) {
      skipNextRestore.current = false;
      applyWindowScrollY(0);
      clearScrollPosition(routeKey);
      prevKey.current = routeKey;
      return;
    }

    restoreScrollPosition(routeKey);
    prevKey.current = routeKey;
  }, [routeKey]);

  useEffect(() => {
    const onClear = () => clearAllScrollPositions();
    const onForceTop = () => {
      skipNextRestore.current = true;
      applyWindowScrollY(0);
      if (routeKey) clearScrollPosition(routeKey);
    };
    window.addEventListener("nexform:user-state-cleared", onClear);
    window.addEventListener("nexform:scroll-force-top", onForceTop);
    return () => {
      window.removeEventListener("nexform:user-state-cleared", onClear);
      window.removeEventListener("nexform:scroll-force-top", onForceTop);
    };
  }, [routeKey]);
}
