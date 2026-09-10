"use client";

import { memo, useCallback, useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { isNavActive } from "@/lib/nav-active";
import { PRIMARY_NAV } from "@/lib/nav-items";
import {
  warmProgressCache,
  warmNavDataCaches,
} from "@/lib/nav-cache-warmer";
import { hapticSelect } from "@/lib/haptic";
import {
  useMainTabNav,
  type MainTab,
  MAIN_TABS,
  matchMainTab,
} from "@/components/layout/persistent-tab-provider";
import {
  NAV_DRAG,
  isTouchLikePointer,
  prefersReducedMotion,
  scrubPositionFromDelta,
  snapScrubIndex,
} from "@/lib/tab-gestures";

const ITEMS = PRIMARY_NAV as ReadonlyArray<{
  href: MainTab;
  label: string;
  icon: (typeof PRIMARY_NAV)[number]["icon"];
}>;

const TAB_COUNT = ITEMS.length;
const INDICATOR_SIZE_REM = 3.1;

function shouldHideBottomNav(pathname: string | null) {
  if (!pathname) return false;
  return (
    pathname.includes("/workouts/live/") ||
    pathname.includes("/nutrition/add/") ||
    pathname.includes("/workouts/exercises/pick")
  );
}

export const BottomNav = memo(function BottomNav() {
  const pathname = usePathname();
  const router = useRouter();
  const tabNav = useMainTabNav();
  const barRef = useRef<HTMLDivElement>(null);
  const [optimisticTab, setOptimisticTab] = useState<MainTab | null>(null);
  const [scrubPos, setScrubPos] = useState<number | null>(null);
  const scrubPosRef = useRef<number | null>(null);

  const setScrub = useCallback((pos: number | null) => {
    scrubPosRef.current = pos;
    setScrubPos(pos);
  }, []);

  const drag = useRef<{
    pointerId: number | null;
    startX: number;
    startY: number;
    startIndex: number;
    timer: ReturnType<typeof setTimeout> | null;
    active: boolean;
    suppressClick: boolean;
  }>({
    pointerId: null,
    startX: 0,
    startY: 0,
    startIndex: 0,
    timer: null,
    active: false,
    suppressClick: false,
  });

  const activeHref =
    optimisticTab ??
    tabNav?.activeTab ??
    matchMainTab(pathname) ??
    (ITEMS.find((item) => isNavActive(pathname, item.href))?.href as
      | MainTab
      | undefined) ??
    "/home";

  const activeIndex = Math.max(
    0,
    ITEMS.findIndex((item) => item.href === activeHref)
  );
  const displayIndex = scrubPos ?? activeIndex;

  useEffect(() => {
    if (!optimisticTab) return;
    if (
      matchMainTab(pathname) === optimisticTab ||
      isNavActive(pathname, optimisticTab)
    ) {
      setOptimisticTab(null);
    }
  }, [pathname, optimisticTab]);

  const warmIntent = useCallback(
    (href: string) => {
      router.prefetch(href);
      if (href === "/progress") warmProgressCache();
      else if (href !== "/more") warmNavDataCaches();
    },
    [router]
  );

  const navigate = useCallback(
    (href: MainTab) => {
      const alreadyActive =
        optimisticTab === href ||
        tabNav?.activeTab === href ||
        isNavActive(pathname, href);

      if (alreadyActive) {
        tabNav?.navigateMainTab(href);
        return;
      }

      setOptimisticTab(href);
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

  const clearDragTimer = useCallback(() => {
    if (drag.current.timer) {
      clearTimeout(drag.current.timer);
      drag.current.timer = null;
    }
  }, []);

  const endScrub = useCallback(
    (commit: boolean) => {
      clearDragTimer();
      const pos = scrubPosRef.current;
      drag.current.active = false;
      drag.current.pointerId = null;
      setScrub(null);
      if (!commit || pos == null) return;
      const next = ITEMS[snapScrubIndex(pos, TAB_COUNT)];
      if (next && next.href !== activeHref) {
        drag.current.suppressClick = true;
        navigate(next.href);
      }
    },
    [activeHref, clearDragTimer, navigate, setScrub]
  );

  const onBarPointerDown = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (!isTouchLikePointer(e)) return;
      const bar = barRef.current;
      if (!bar) return;
      drag.current.pointerId = e.pointerId;
      drag.current.startX = e.clientX;
      drag.current.startY = e.clientY;
      drag.current.startIndex = activeIndex;
      drag.current.active = false;
      drag.current.suppressClick = false;
      clearDragTimer();
      drag.current.timer = setTimeout(() => {
        drag.current.active = true;
        try {
          bar.setPointerCapture(e.pointerId);
        } catch {
          /* ignore */
        }
        setScrub(activeIndex);
      }, NAV_DRAG.longPressMs);
    },
    [activeIndex, clearDragTimer, setScrub]
  );

  const onBarPointerMove = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (drag.current.pointerId !== e.pointerId) return;
      const dx = e.clientX - drag.current.startX;
      const dy = e.clientY - drag.current.startY;

      if (!drag.current.active) {
        if (Math.abs(dy) > NAV_DRAG.verticalCancelPx && Math.abs(dy) > Math.abs(dx)) {
          clearDragTimer();
          return;
        }
        if (Math.abs(dx) > NAV_DRAG.preLockSlopPx && !drag.current.timer) {
          return;
        }
        return;
      }

      const bar = barRef.current;
      if (!bar) return;
      const tabWidth = bar.clientWidth / TAB_COUNT;
      const next = scrubPositionFromDelta(
        drag.current.startIndex,
        dx,
        tabWidth,
        TAB_COUNT
      );
      setScrub(next);
    },
    [clearDragTimer, setScrub]
  );

  const onBarPointerUp = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (drag.current.pointerId !== e.pointerId) return;
      const wasActive = drag.current.active;
      if (wasActive) {
        e.preventDefault();
        endScrub(true);
      } else {
        clearDragTimer();
        drag.current.pointerId = null;
      }
    },
    [clearDragTimer, endScrub]
  );

  const onBarPointerCancel = useCallback(() => {
    clearDragTimer();
    drag.current.active = false;
    drag.current.pointerId = null;
    setScrub(null);
  }, [clearDragTimer, setScrub]);

  if (shouldHideBottomNav(pathname)) return null;

  const reduced = prefersReducedMotion();
  const indicatorLeft = `calc((100% / ${TAB_COUNT}) * ${displayIndex} + (100% / ${TAB_COUNT} / 2) - ${INDICATOR_SIZE_REM / 2}rem)`;

  return (
    <nav
      className="bottom-nav-ios fixed bottom-0 left-0 right-0 z-50 overflow-visible lg:hidden"
      aria-label="Hauptnavigation"
      data-no-tab-swipe
    >
      <div className="bottom-nav-ios-inner mx-auto w-full max-w-[430px] overflow-visible px-2 pt-3 pb-[max(0.2rem,env(safe-area-inset-bottom))]">
        <div
          ref={barRef}
          className="bottom-nav-ios-bar relative flex items-stretch overflow-visible"
          onPointerDown={onBarPointerDown}
          onPointerMove={onBarPointerMove}
          onPointerUp={onBarPointerUp}
          onPointerCancel={onBarPointerCancel}
        >
          <div
            className="bottom-nav-ios-indicator"
            aria-hidden
            style={{
              width: `${INDICATOR_SIZE_REM}rem`,
              height: `${INDICATOR_SIZE_REM}rem`,
              left: indicatorLeft,
              transition: reduced || scrubPos != null
                ? "none"
                : `left ${NAV_DRAG.indicatorTransitionMs}ms cubic-bezier(0.22, 1, 0.36, 1)`,
            }}
          />
          {ITEMS.map(({ href, label, icon: Icon }, index) => {
            const active = Math.round(displayIndex) === index;
            return (
              <button
                key={href}
                type="button"
                onPointerEnter={() => warmIntent(href)}
                onFocus={() => warmIntent(href)}
                onClick={() => {
                  if (drag.current.suppressClick) {
                    drag.current.suppressClick = false;
                    return;
                  }
                  navigate(href);
                }}
                className={cn(
                  "bottom-nav-ios-tab relative z-[1] flex flex-1 flex-col items-center justify-center gap-0.5",
                  "min-h-[2.85rem] min-w-0 px-1 py-1.5 touch-manipulation select-none",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40 rounded-lg",
                  active ? "bottom-nav-ios-tab--active" : "bottom-nav-ios-tab--idle"
                )}
                aria-current={active ? "page" : undefined}
                aria-label={label}
              >
                <Icon
                  className={cn(
                    "h-[1.35rem] w-[1.35rem] shrink-0",
                    active
                      ? "text-zinc-950 -translate-y-1.5"
                      : "text-zinc-500 translate-y-0"
                  )}
                  style={{
                    transition: reduced
                      ? "none"
                      : "transform 160ms ease, color 160ms ease",
                  }}
                  strokeWidth={active ? 2.25 : 1.85}
                  aria-hidden
                />
                <span
                  className={cn(
                    "bottom-nav-ios-label truncate max-w-[4.75rem] text-center leading-none text-[10px]",
                    active ? "text-accent font-semibold" : "text-zinc-500 font-medium"
                  )}
                  style={{
                    transition: reduced ? "none" : "color 160ms ease, opacity 160ms ease",
                  }}
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
