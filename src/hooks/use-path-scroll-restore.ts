"use client";

import { useEffect, useLayoutEffect, useRef } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import {
  applyWindowScrollY,
  clearScrollRestoreState,
  getWindowScrollY,
  restoreScrollPosition,
  saveScrollPosition,
  scrollRouteKey,
} from "@/lib/scroll-restore";

/**
 * Persists window scroll per route (incl. settings ?view=) and restores on return.
 * Works with Keep-Alive main tabs and nested App Router pages.
 */
export function usePathScrollRestore() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const search = searchParams?.toString() ?? "";
  const routeKey = scrollRouteKey(pathname, search);
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
      saveScrollPosition(routeKey, 0);
      prevKey.current = routeKey;
      return;
    }

    const cancel = restoreScrollPosition(routeKey);
    prevKey.current = routeKey;
    return cancel;
  }, [routeKey]);

  useEffect(() => {
    const onClear = () => clearScrollRestoreState();
    const onForceTop = () => {
      skipNextRestore.current = true;
      applyWindowScrollY(0);
      if (routeKey) saveScrollPosition(routeKey, 0);
    };
    window.addEventListener("nexform:user-state-cleared", onClear);
    window.addEventListener("nexform:scroll-force-top", onForceTop);
    return () => {
      window.removeEventListener("nexform:user-state-cleared", onClear);
      window.removeEventListener("nexform:scroll-force-top", onForceTop);
    };
  }, [routeKey]);
}
