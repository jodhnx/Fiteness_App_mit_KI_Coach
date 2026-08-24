"use client";

import {
  useCallback,
  useEffect,
  useRef,
  type ReactNode,
  type PointerEvent as ReactPointerEvent,
} from "react";
import { usePathname } from "next/navigation";
import {
  MAIN_TABS,
  matchMainTab,
  useMainTabNav,
  type MainTab,
} from "@/components/layout/persistent-tab-provider";
import { hapticSelect } from "@/lib/haptic";
import {
  adjacentTab,
  isTouchLikePointer,
  prefersReducedMotion,
  TAB_SWIPE,
} from "@/lib/tab-gestures";
import {
  warmProgressCache,
  warmNavDataCaches,
} from "@/lib/nav-cache-warmer";

type Axis = "none" | "h" | "v";

function warmTab(href: MainTab) {
  if (href === "/progress") warmProgressCache();
  else warmNavDataCaches();
}

/**
 * Interactive horizontal swipe between main tabs.
 * Vertical scroll wins when dominant. Touch/pen only (desktop mouse ignored).
 */
export function TabSwipeLayer({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const tabNav = useMainTabNav();
  const rootRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);

  const startX = useRef(0);
  const startY = useRef(0);
  const startT = useRef(0);
  const axis = useRef<Axis>("none");
  const dragging = useRef(false);
  const offset = useRef(0);
  const pointerId = useRef<number | null>(null);
  const animating = useRef(false);

  const activeTab = matchMainTab(pathname);

  const setTransform = useCallback((x: number, animate: boolean) => {
    const el = trackRef.current;
    if (!el) return;
    if (prefersReducedMotion()) {
      el.style.transition = "none";
      el.style.transform = "none";
      el.style.opacity = "1";
      return;
    }
    el.style.transition = animate
      ? `transform ${TAB_SWIPE.settleMs}ms cubic-bezier(0.32, 0.72, 0, 1), opacity ${TAB_SWIPE.settleMs}ms ease`
      : "none";
    el.style.transform = x === 0 ? "none" : `translate3d(${x}px, 0, 0)`;
    const abs = Math.abs(x);
    const fade = abs > 8 ? Math.max(0.92, 1 - abs / 1400) : 1;
    el.style.opacity = String(fade);
  }, []);

  const resetTransform = useCallback(() => {
    offset.current = 0;
    setTransform(0, true);
  }, [setTransform]);

  const goTo = useCallback(
    (href: MainTab) => {
      try {
        sessionStorage.setItem(
          `nexform:tab-visited:${href.replace("/", "")}`,
          "1"
        );
      } catch {
        /* ignore */
      }
      warmTab(href);
      hapticSelect();
      tabNav?.navigateMainTab(href);
    },
    [tabNav]
  );

  const onPointerDown = useCallback(
    (e: ReactPointerEvent<HTMLDivElement>) => {
      if (!activeTab || !tabNav) return;
      if (!isTouchLikePointer(e)) return;
      if (animating.current) return;
      // Don't steal gestures from inputs / sheets / horizontal carousels
      const t = e.target as HTMLElement | null;
      if (
        t?.closest(
          "input, textarea, select, [data-no-tab-swipe], [data-sheet], .food-add-popup-root, [role='dialog'], [role='slider']"
        )
      ) {
        return;
      }

      pointerId.current = e.pointerId;
      startX.current = e.clientX;
      startY.current = e.clientY;
      startT.current = performance.now();
      axis.current = "none";
      dragging.current = false;
      offset.current = 0;
    },
    [activeTab, tabNav]
  );

  const onPointerMove = useCallback(
    (e: ReactPointerEvent<HTMLDivElement>) => {
      if (pointerId.current !== e.pointerId) return;
      if (!activeTab || prefersReducedMotion()) return;

      const dx = e.clientX - startX.current;
      const dy = e.clientY - startY.current;

      if (axis.current === "none") {
        if (Math.abs(dx) < TAB_SWIPE.axisLock && Math.abs(dy) < TAB_SWIPE.axisLock) {
          return;
        }
        if (Math.abs(dy) > Math.abs(dx)) {
          axis.current = "v";
          return;
        }
        // Edge: don't start horizontal if no adjacent tab in that direction
        const dir: -1 | 1 = dx < 0 ? 1 : -1;
        if (!adjacentTab(activeTab, dir)) {
          axis.current = "v";
          return;
        }
        axis.current = "h";
        dragging.current = true;
        try {
          rootRef.current?.setPointerCapture(e.pointerId);
        } catch {
          /* ignore */
        }
      }

      if (axis.current !== "h") return;
      e.preventDefault();

      const width = rootRef.current?.clientWidth ?? window.innerWidth;
      const max = width * TAB_SWIPE.maxDragRatio;
      // Rubber-band at edges
      let next = dx;
      const dir: -1 | 1 = dx < 0 ? 1 : -1;
      if (!adjacentTab(activeTab, dir)) {
        next = dx * 0.25;
      } else {
        next = Math.max(-max, Math.min(max, dx));
      }
      offset.current = next;
      setTransform(next, false);
    },
    [activeTab, setTransform]
  );

  const finish = useCallback(
    (e: ReactPointerEvent<HTMLDivElement>) => {
      if (pointerId.current !== e.pointerId) return;
      const wasH = axis.current === "h" && dragging.current;
      pointerId.current = null;
      axis.current = "none";
      dragging.current = false;

      try {
        rootRef.current?.releasePointerCapture(e.pointerId);
      } catch {
        /* ignore */
      }

      if (!wasH || !activeTab) {
        resetTransform();
        return;
      }

      const dx = offset.current;
      const dt = Math.max(16, performance.now() - startT.current);
      const velocity = Math.abs(dx) / dt;
      const commit =
        Math.abs(dx) >= TAB_SWIPE.minDistance || velocity >= TAB_SWIPE.minVelocity;

      if (!commit) {
        resetTransform();
        return;
      }

      const dir: -1 | 1 = dx < 0 ? 1 : -1;
      const next = adjacentTab(activeTab, dir);
      if (!next) {
        resetTransform();
        return;
      }

      goTo(next);
      offset.current = 0;
      setTransform(0, false);
      animating.current = false;
    },
    [activeTab, goTo, resetTransform, setTransform]
  );

  // Reset transform when route settles
  useEffect(() => {
    resetTransform();
    animating.current = false;
  }, [pathname, resetTransform]);

  // Prefetch neighbors
  useEffect(() => {
    if (!activeTab) return;
    const i = MAIN_TABS.indexOf(activeTab);
    if (i > 0) warmTab(MAIN_TABS[i - 1]);
    if (i < MAIN_TABS.length - 1) warmTab(MAIN_TABS[i + 1]);
  }, [activeTab]);

  // Only enable swipe shell on exact main tabs
  const enabled = activeTab != null && MAIN_TABS.includes(activeTab);

  if (!enabled) {
    return <>{children}</>;
  }

  return (
    <div
      ref={rootRef}
      className="tab-swipe-root relative touch-pan-y"
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={finish}
      onPointerCancel={finish}
    >
      <div ref={trackRef} className="tab-swipe-track will-change-transform transform-gpu">
        {children}
      </div>
    </div>
  );
}
