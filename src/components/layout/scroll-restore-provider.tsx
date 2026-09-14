"use client";

import { useEffect, useLayoutEffect, useRef } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import {
  buildScrollKeyNormalized,
  clearAllScrollPositions,
  clearScrollPosition,
  readWindowScrollY,
  restoreScrollPosition,
  saveScrollPosition,
  type ScrollNavKind,
} from "@/lib/scroll-restore";

/**
 * Saves scroll on leave; restores on return (back/forward/close) without flash.
 * Main-tab keep-alive stays intact — positions are keyed per route.
 *
 * Critical: never re-save the previous route from a post-navigation cleanup
 * using window.scrollY (already reset). Use lastKnownY instead.
 */
export function ScrollRestoreProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const search = searchParams?.toString() ? `?${searchParams.toString()}` : "";
  const key = buildScrollKeyNormalized(pathname, search);
  const prevKeyRef = useRef<string | null>(null);
  const lastYRef = useRef(0);
  const lastKeyRef = useRef<string | null>(null);
  const restoringRef = useRef(false);
  const navKindRef = useRef<ScrollNavKind>("push");

  useEffect(() => {
    const onPopState = () => {
      navKindRef.current = "pop";
    };
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  // Persist current route scroll while the user scrolls (throttled via rAF).
  useEffect(() => {
    if (!key) return;
    lastKeyRef.current = key;
    let raf = 0;
    const onScroll = () => {
      if (restoringRef.current) return;
      const y = readWindowScrollY();
      lastYRef.current = y;
      if (raf) return;
      raf = window.requestAnimationFrame(() => {
        raf = 0;
        saveScrollPosition(key, lastYRef.current);
      });
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    const nested = Array.from(
      document.querySelectorAll("[data-scroll-restore]")
    );
    for (const el of nested) {
      el.addEventListener("scroll", onScroll, { passive: true });
    }
    return () => {
      window.removeEventListener("scroll", onScroll);
      for (const el of nested) {
        el.removeEventListener("scroll", onScroll);
      }
      if (raf) window.cancelAnimationFrame(raf);
      // Do NOT save window.scrollY here — it may already be the next page's 0.
      // Snapshot was kept in lastYRef / pointerdown / layout effect.
    };
  }, [key]);

  // Before paint: freeze previous key's last known Y, then restore current.
  useLayoutEffect(() => {
    const prev = prevKeyRef.current;
    if (prev && prev !== key) {
      saveScrollPosition(prev, lastYRef.current);
    }

    restoringRef.current = true;
    const hash =
      typeof window !== "undefined" ? window.location.hash.slice(1) : "";
    const kind = navKindRef.current;
    restoreScrollPosition(key, { hash, navKind: kind });
    // After restore, seed lastY for the new route
    lastYRef.current = readWindowScrollY();
    navKindRef.current = "push";
    prevKeyRef.current = key;

    const t = window.setTimeout(() => {
      restoringRef.current = false;
    }, 120);
    return () => window.clearTimeout(t);
  }, [key]);

  useEffect(() => {
    const persist = () => {
      if (key) saveScrollPosition(key, lastYRef.current);
    };
    window.addEventListener("pagehide", persist);
    const onVis = () => {
      if (document.visibilityState === "hidden") persist();
    };
    document.addEventListener("visibilitychange", onVis);
    const onClear = () => clearAllScrollPositions();
    window.addEventListener("nexform:user-state-cleared", onClear);
    return () => {
      window.removeEventListener("pagehide", persist);
      document.removeEventListener("visibilitychange", onVis);
      window.removeEventListener("nexform:user-state-cleared", onClear);
    };
  }, [key]);

  useEffect(() => {
    const onPointerDown = (e: PointerEvent) => {
      const target = e.target as HTMLElement | null;
      const anchor = target?.closest?.("a[href]") as HTMLAnchorElement | null;
      if (anchor) {
        if (anchor.target === "_blank" || anchor.hasAttribute("download")) return;
        const href = anchor.getAttribute("href");
        if (!href || href.startsWith("#")) return;
        lastYRef.current = readWindowScrollY();
        saveScrollPosition(key, lastYRef.current);
        return;
      }
      const btn = target?.closest?.(
        'button[aria-label="Zurück"], button[aria-label="Back"]'
      );
      if (btn) {
        lastYRef.current = readWindowScrollY();
        saveScrollPosition(key, lastYRef.current);
      }
    };
    document.addEventListener("pointerdown", onPointerDown, true);
    return () =>
      document.removeEventListener("pointerdown", onPointerDown, true);
  }, [key]);

  return <>{children}</>;
}

/** Same-tab re-tap: clear stored position and jump to top. */
export function scrollMainTabToTop(pathname: string): void {
  clearScrollPosition(buildScrollKeyNormalized(pathname, ""));
  const html = document.documentElement;
  const prev = html.style.scrollBehavior;
  html.style.scrollBehavior = "auto";
  window.scrollTo(0, 0);
  document.documentElement.scrollTop = 0;
  document.body.scrollTop = 0;
  html.style.scrollBehavior = prev;
}
