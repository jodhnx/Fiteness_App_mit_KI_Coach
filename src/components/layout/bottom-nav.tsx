"use client";

import { memo, useCallback, useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
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
import { prefersReducedMotion, scrubIndexFromDelta } from "@/lib/tab-gestures";

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
const LONG_PRESS_MS = 420;

function shouldHideBottomNav(pathname: string | null) {
  if (!pathname) return false;
  return (
    pathname.includes("/workouts/live/") ||
    pathname.includes("/nutrition/add/") ||
    pathname.includes("/workouts/exercises/pick")
  );
}

function resolveActiveIndex(
  optimistic: MainTab | null,
  scrub: number | null,
  activeTab: MainTab | null | undefined,
  pathname: string | null
): number {
  if (scrub != null) return scrub;
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
  const [scrubIndex, setScrubIndex] = useState<number | null>(null);
  const scrubIndexRef = useRef<number | null>(null);
  const scrubbing = useRef(false);
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pressStart = useRef<{ x: number; y: number; index: number } | null>(
    null
  );
  const lastHapticIdx = useRef<number | null>(null);
  const suppressClick = useRef(false);

  const activeIndex = resolveActiveIndex(
    optimisticTab,
    scrubIndex,
    tabNav?.activeTab,
    pathname
  );

  useEffect(() => {
    if (!optimisticTab) return;
    const matched = matchMainTab(pathname);
    if (matched === optimisticTab || isNavActive(pathname, optimisticTab)) {
      setOptimisticTab(null);
    }
  }, [pathname, optimisticTab]);

  useEffect(() => {
    if (bounceIndex == null) return;
    const id = window.setTimeout(() => setBounceIndex(null), 220);
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

  const endScrub = useCallback(
    (commit: boolean) => {
      clearLongPress();
      const idx = scrubIndexRef.current;
      scrubbing.current = false;
      scrubIndexRef.current = null;
      setScrubIndex(null);
      pressStart.current = null;
      lastHapticIdx.current = null;
      if (commit && idx != null) {
        suppressClick.current = true;
        navigate(ITEMS[idx].href, idx);
        window.setTimeout(() => {
          suppressClick.current = false;
        }, 80);
      }
    },
    [clearLongPress, navigate]
  );

  const onTabPointerDown = useCallback(
    (e: ReactPointerEvent, index: number) => {
      if (e.pointerType === "mouse" && e.button !== 0) return;
      pressStart.current = { x: e.clientX, y: e.clientY, index };
      clearLongPress();
      longPressTimer.current = setTimeout(() => {
        scrubbing.current = true;
        scrubIndexRef.current = index;
        setScrubIndex(index);
        lastHapticIdx.current = index;
        hapticTap();
        try {
          barRef.current?.setPointerCapture?.(e.pointerId);
        } catch {
          /* ignore */
        }
      }, LONG_PRESS_MS);
    },
    [clearLongPress]
  );

  const onTabPointerMove = useCallback(
    (e: ReactPointerEvent) => {
      const start = pressStart.current;
      if (!start) return;

      const dx = e.clientX - start.x;
      const dy = e.clientY - start.y;

      // Cancel long-press if finger moves too early (normal tap/scroll)
      if (!scrubbing.current) {
        if (Math.abs(dx) > 12 || Math.abs(dy) > 12) {
          clearLongPress();
        }
        return;
      }

      const width = barRef.current?.clientWidth ?? 1;
      const tabW = width / TAB_COUNT;
      const next = scrubIndexFromDelta(start.index, dx, tabW, TAB_COUNT);
      scrubIndexRef.current = next;
      setScrubIndex(next);
      if (lastHapticIdx.current !== next) {
        lastHapticIdx.current = next;
        hapticTap();
        warmIntent(ITEMS[next].href);
      }
    },
    [clearLongPress, warmIntent]
  );

  const onTabPointerUp = useCallback(() => {
    if (scrubbing.current) {
      endScrub(true);
      return;
    }
    clearLongPress();
    pressStart.current = null;
  }, [clearLongPress, endScrub]);

  if (shouldHideBottomNav(pathname)) return null;

  const reduced = prefersReducedMotion();

  return (
    <nav
      className="bottom-nav-v3-root fixed bottom-0 left-0 right-0 z-50 lg:hidden pointer-events-none"
      aria-label="Hauptnavigation"
    >
      <div className="pointer-events-auto mx-auto w-full max-w-[430px] px-4 pb-[max(0.5rem,env(safe-area-inset-bottom))]">
        <div
          ref={barRef}
          className={cn(
            "bottom-nav-v3 relative flex items-center",
            scrubIndex != null && "bottom-nav-v3--scrubbing"
          )}
          onPointerMove={onTabPointerMove}
          onPointerUp={onTabPointerUp}
          onPointerCancel={() => endScrub(false)}
        >
          {/* Organic sliding capsule indicator */}
          <div
            className="bottom-nav-v3-indicator absolute top-1/2 z-0 pointer-events-none"
            style={{
              width: `${100 / TAB_COUNT}%`,
              transform: `translate3d(${activeIndex * 100}%, -50%, 0)`,
              transition: reduced
                ? "none"
                : scrubIndex != null
                  ? "transform 80ms linear"
                  : "transform 240ms cubic-bezier(0.32, 0.72, 0, 1)",
            }}
            aria-hidden
          >
            <div className="bottom-nav-v3-indicator-inner" />
          </div>

          {ITEMS.map(({ href, label, icon: Icon }, index) => {
            const active = index === activeIndex;
            const bouncing = bounceIndex === index;
            return (
              <button
                key={href}
                type="button"
                onPointerEnter={() => warmIntent(href)}
                onFocus={() => warmIntent(href)}
                onTouchStart={() => warmIntent(href)}
                onPointerDown={(e) => onTabPointerDown(e, index)}
                onClick={() => {
                  if (suppressClick.current || scrubbing.current) return;
                  navigate(href, index);
                }}
                className={cn(
                  "bottom-nav-v3-tab relative z-10 flex flex-1 flex-col items-center justify-center gap-0.5",
                  "min-h-[56px] min-w-[44px] px-1 py-2 touch-manipulation select-none",
                  active
                    ? "bottom-nav-v3-tab--active text-accent"
                    : "text-zinc-500"
                )}
                aria-current={active ? "page" : undefined}
                aria-label={label}
              >
                <span
                  className={cn(
                    "bottom-nav-v3-icon inline-flex items-center justify-center transform-gpu",
                    active && "bottom-nav-v3-icon--active",
                    bouncing && "bottom-nav-v3-icon--bounce"
                  )}
                >
                  <Icon
                    className="h-[22px] w-[22px]"
                    strokeWidth={active ? 2.35 : 1.85}
                    aria-hidden
                  />
                </span>
                <span
                  className={cn(
                    "bottom-nav-v3-label truncate max-w-[4.6rem] text-center leading-none",
                    active ? "opacity-100 font-semibold" : "opacity-55 font-medium"
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
