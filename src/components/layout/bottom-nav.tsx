"use client";

import {
  memo,
  useCallback,
  useEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from "react";
import { usePathname, useRouter } from "next/navigation";
import { Home, Dumbbell, Apple, TrendingUp, Bot } from "lucide-react";
import { cn } from "@/lib/utils";
import { isNavActive } from "@/lib/nav-active";
import {
  warmProgressCache,
  warmNavDataCaches,
} from "@/lib/nav-cache-warmer";
import { hapticSelect, hapticTap } from "@/lib/haptic";
import {
  useMainTabNav,
  type MainTab,
  MAIN_TABS,
  matchMainTab,
} from "@/components/layout/persistent-tab-provider";
import {
  NAV_DRAG,
  prefersReducedMotion,
  scrubPositionFromDelta,
  snapScrubIndex,
  tabCenterFraction,
} from "@/lib/tab-gestures";

const ITEMS = [
  { href: "/home", label: "Home", icon: Home },
  { href: "/workouts", label: "Training", icon: Dumbbell },
  { href: "/nutrition", label: "Ernährung", icon: Apple },
  { href: "/progress", label: "Fortschritt", icon: TrendingUp },
  { href: "/coach", label: "Coach", icon: Bot },
] as const satisfies ReadonlyArray<{
  href: MainTab;
  label: string;
  icon: typeof Home;
}>;

const TAB_COUNT = ITEMS.length;

type DragPhase = "idle" | "pending" | "scrub";

function shouldHideBottomNav(pathname: string | null) {
  if (!pathname) return false;
  return (
    pathname.includes("/workouts/live/") ||
    pathname.includes("/nutrition/add/") ||
    pathname.includes("/workouts/exercises/pick")
  );
}

function resolveRouteIndex(
  optimistic: MainTab | null,
  activeTab: MainTab | null | undefined,
  pathname: string | null
): number {
  const href =
    optimistic ??
    activeTab ??
    matchMainTab(pathname) ??
    (ITEMS.find((item) => isNavActive(pathname, item.href))?.href as
      | MainTab
      | undefined);
  if (!href) return 0;
  const idx = ITEMS.findIndex((item) => item.href === href);
  return idx >= 0 ? idx : 0;
}

export const BottomNav = memo(function BottomNav() {
  const pathname = usePathname();
  const router = useRouter();
  const tabNav = useMainTabNav();
  const barRef = useRef<HTMLDivElement>(null);

  const [optimisticTab, setOptimisticTab] = useState<MainTab | null>(null);
  const [bounceIndex, setBounceIndex] = useState<number | null>(null);
  /** Fractional 0…TAB_COUNT-1 — drives circle position */
  const [indicatorPos, setIndicatorPos] = useState<number | null>(null);
  const [scrubbingUi, setScrubbingUi] = useState(false);

  const phase = useRef<DragPhase>("idle");
  const pointerId = useRef<number | null>(null);
  const startX = useRef(0);
  const startY = useRef(0);
  const startIndex = useRef(0);
  const fractionalPos = useRef(0);
  const lastHapticIdx = useRef<number | null>(null);
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const suppressClick = useRef(false);
  const movedPx = useRef(0);

  const routeIndex = resolveRouteIndex(
    optimisticTab,
    tabNav?.activeTab,
    pathname
  );

  const displayIndex =
    indicatorPos != null ? snapScrubIndex(indicatorPos, TAB_COUNT) : routeIndex;

  const circleLeftPct =
    indicatorPos != null
      ? tabCenterFraction(indicatorPos, TAB_COUNT) * 100
      : tabCenterFraction(routeIndex, TAB_COUNT) * 100;

  useEffect(() => {
    if (!optimisticTab) return;
    const matched = matchMainTab(pathname);
    if (matched === optimisticTab || isNavActive(pathname, optimisticTab)) {
      setOptimisticTab(null);
    }
  }, [pathname, optimisticTab]);

  useEffect(() => {
    if (indicatorPos == null && routeIndex >= 0) {
      fractionalPos.current = routeIndex;
    }
  }, [routeIndex, indicatorPos]);

  useEffect(() => {
    if (bounceIndex == null) return;
    const id = window.setTimeout(() => setBounceIndex(null), 240);
    return () => window.clearTimeout(id);
  }, [bounceIndex]);

  const warmIntent = useCallback(
    (href: string) => {
      router.prefetch(href);
      if (href === "/progress") warmProgressCache();
      else warmNavDataCaches();
    },
    [router]
  );

  const navigate = useCallback(
    (href: MainTab, index: number) => {
      const alreadyActive =
        optimisticTab === href ||
        tabNav?.activeTab === href ||
        isNavActive(pathname, href);

      if (alreadyActive) {
        tabNav?.navigateMainTab(href);
        return;
      }

      setOptimisticTab(href);
      setBounceIndex(index);
      hapticSelect();

      try {
        sessionStorage.setItem(
          `nexform:tab-visited:${href.replace("/", "")}`,
          "1"
        );
      } catch {
        /* ignore */
      }

      if (tabNav && (MAIN_TABS as readonly string[]).includes(href)) {
        tabNav.navigateMainTab(href);
        return;
      }
      router.prefetch(href);
      router.push(href);
    },
    [pathname, router, tabNav, optimisticTab]
  );

  const clearLongPress = useCallback(() => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  }, []);

  const resetDrag = useCallback(() => {
    clearLongPress();
    phase.current = "idle";
    pointerId.current = null;
    lastHapticIdx.current = null;
    movedPx.current = 0;
    setIndicatorPos(null);
    setScrubbingUi(false);
  }, [clearLongPress]);

  const releaseCapture = useCallback((id: number) => {
    try {
      barRef.current?.releasePointerCapture(id);
    } catch {
      /* ignore */
    }
  }, []);

  const enterScrub = useCallback((index: number) => {
    phase.current = "scrub";
    startIndex.current = index;
    fractionalPos.current = index;
    lastHapticIdx.current = index;
    setIndicatorPos(index);
    setScrubbingUi(true);
    hapticTap();
  }, []);

  const onBarPointerDown = useCallback(
    (e: ReactPointerEvent<HTMLDivElement>) => {
      const target = e.target as HTMLElement;
      const tabEl = target.closest<HTMLElement>("[data-nav-tab]");
      if (!tabEl) return;

      const index = Number(tabEl.dataset.navTab);
      if (!Number.isFinite(index) || index < 0 || index >= TAB_COUNT) return;

      pointerId.current = e.pointerId;
      startX.current = e.clientX;
      startY.current = e.clientY;
      startIndex.current = index;
      movedPx.current = 0;
      phase.current = "pending";

      try {
        barRef.current?.setPointerCapture(e.pointerId);
      } catch {
        /* ignore */
      }

      clearLongPress();
      longPressTimer.current = setTimeout(() => {
        if (phase.current !== "pending") return;
        enterScrub(index);
      }, NAV_DRAG.longPressMs);
    },
    [clearLongPress, enterScrub]
  );

  const onBarPointerMove = useCallback(
    (e: ReactPointerEvent<HTMLDivElement>) => {
      if (pointerId.current !== e.pointerId) return;

      const dx = e.clientX - startX.current;
      const dy = e.clientY - startY.current;
      movedPx.current = Math.max(movedPx.current, Math.hypot(dx, dy));

      if (phase.current === "pending") {
        if (
          Math.abs(dy) > NAV_DRAG.verticalCancelPx &&
          Math.abs(dy) > Math.abs(dx)
        ) {
          resetDrag();
          releaseCapture(e.pointerId);
          return;
        }
        return;
      }

      if (phase.current !== "scrub") return;

      e.preventDefault();

      const width = barRef.current?.clientWidth ?? 1;
      const tabW = width / TAB_COUNT;
      const pos = scrubPositionFromDelta(startIndex.current, dx, tabW, TAB_COUNT);
      fractionalPos.current = pos;
      setIndicatorPos(pos);

      const nearest = snapScrubIndex(pos, TAB_COUNT);
      if (lastHapticIdx.current !== nearest) {
        lastHapticIdx.current = nearest;
        hapticTap();
        warmIntent(ITEMS[nearest].href);
      }
    },
    [releaseCapture, resetDrag, warmIntent]
  );

  const onBarPointerUp = useCallback(
    (e: ReactPointerEvent<HTMLDivElement>) => {
      if (pointerId.current !== e.pointerId) return;

      const wasScrub = phase.current === "scrub";
      const idx = snapScrubIndex(fractionalPos.current, TAB_COUNT);
      const moved = movedPx.current;

      clearLongPress();
      releaseCapture(e.pointerId);
      pointerId.current = null;

      if (wasScrub) {
        suppressClick.current = true;
        setIndicatorPos(null);
        setScrubbingUi(false);
        phase.current = "idle";
        hapticSelect();
        navigate(ITEMS[idx].href, idx);
        window.setTimeout(() => {
          suppressClick.current = false;
        }, 120);
        return;
      }

      phase.current = "idle";

      if (moved > NAV_DRAG.preLockSlopPx) {
        suppressClick.current = true;
        window.setTimeout(() => {
          suppressClick.current = false;
        }, 80);
      }
    },
    [clearLongPress, navigate, releaseCapture]
  );

  const onBarPointerCancel = useCallback(
    (e: ReactPointerEvent<HTMLDivElement>) => {
      if (pointerId.current !== e.pointerId) return;
      releaseCapture(e.pointerId);
      resetDrag();
    },
    [releaseCapture, resetDrag]
  );

  const onTabClick = useCallback(
    (href: MainTab, index: number) => {
      if (suppressClick.current || phase.current === "scrub") return;
      navigate(href, index);
    },
    [navigate]
  );

  if (shouldHideBottomNav(pathname)) return null;

  const reduced = prefersReducedMotion();
  const isScrubbing = scrubbingUi && indicatorPos != null;

  return (
    <nav
      className="bottom-nav-v3-root fixed bottom-0 left-0 right-0 z-50 lg:hidden pointer-events-none"
      aria-label="Hauptnavigation"
      data-no-tab-swipe
    >
      <div className="pointer-events-auto mx-auto w-full max-w-[430px] px-4 pb-[max(0.5rem,env(safe-area-inset-bottom))]">
        <div
          ref={barRef}
          className={cn(
            "bottom-nav-v3 relative flex items-stretch",
            isScrubbing && "bottom-nav-v3--scrubbing"
          )}
          style={{ touchAction: "manipulation" }}
          onPointerDown={onBarPointerDown}
          onPointerMove={onBarPointerMove}
          onPointerUp={onBarPointerUp}
          onPointerCancel={onBarPointerCancel}
        >
          {/* Circle centered on icon: bar padding + tab py + half icon-wrap */}
          <div
            className="bottom-nav-v3-circle pointer-events-none"
            style={{
              left: `${circleLeftPct}%`,
              top: "calc(0.2rem + 0.5rem + 0.6875rem)",
              transform: "translateX(-50%)",
              transition: reduced
                ? "none"
                : isScrubbing
                  ? "left 0ms linear"
                  : `left ${NAV_DRAG.indicatorTransitionMs}ms cubic-bezier(0.32, 0.72, 0, 1)`,
            }}
            aria-hidden
          />

          {ITEMS.map(({ href, label, icon: Icon }, index) => {
            const active = index === displayIndex;
            const bouncing = bounceIndex === index;
            return (
              <button
                key={href}
                type="button"
                data-nav-tab={index}
                onPointerEnter={() => warmIntent(href)}
                onFocus={() => warmIntent(href)}
                onClick={() => onTabClick(href, index)}
                className={cn(
                  "bottom-nav-v3-tab relative z-10 flex flex-1 flex-col items-center justify-center gap-0.5",
                  "min-h-[56px] min-w-0 px-0 py-2 touch-manipulation select-none",
                  active
                    ? "bottom-nav-v3-tab--active text-accent"
                    : "text-zinc-500"
                )}
                aria-current={active ? "page" : undefined}
                aria-label={label}
              >
                <span
                  className={cn(
                    "bottom-nav-v3-icon-wrap flex items-center justify-center",
                    active && "bottom-nav-v3-icon-wrap--active",
                    bouncing && "bottom-nav-v3-icon-wrap--bounce"
                  )}
                >
                  <Icon
                    className="bottom-nav-v3-icon h-[22px] w-[22px]"
                    strokeWidth={active ? 2.35 : 1.85}
                    aria-hidden
                  />
                </span>
                <span
                  className={cn(
                    "bottom-nav-v3-label truncate max-w-[4.6rem] text-center leading-none",
                    active ? "bottom-nav-v3-label--active" : "bottom-nav-v3-label--idle"
                  )}
                >
                  {label}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </nav>
  );
});
