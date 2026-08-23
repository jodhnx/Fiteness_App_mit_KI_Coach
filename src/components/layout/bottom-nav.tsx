"use client";

import { memo, useCallback, useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Home, Dumbbell, Apple, TrendingUp, Bot } from "lucide-react";
import { cn } from "@/lib/utils";
import { isNavActive } from "@/lib/nav-active";
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
  const [optimisticTab, setOptimisticTab] = useState<MainTab | null>(null);
  const [bounceIndex, setBounceIndex] = useState<number | null>(null);

  const activeIndex = resolveActiveIndex(
    optimisticTab,
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
      if (alreadyActive) return;

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

  if (shouldHideBottomNav(pathname)) return null;

  return (
    <nav
      className="bottom-nav-v2-root fixed bottom-0 left-0 right-0 z-50 lg:hidden pointer-events-none"
      aria-label="Hauptnavigation"
    >
      <div className="pointer-events-auto mx-auto w-full max-w-[430px] px-3 pb-[max(0.45rem,env(safe-area-inset-bottom))]">
        <div className="bottom-nav-v2 relative flex items-stretch overflow-hidden rounded-[1.35rem]">
          {/* Sliding active indicator — transform only */}
          <div
            className="bottom-nav-v2-pill absolute inset-y-1.5 left-0 z-0 pointer-events-none"
            style={{
              width: `${100 / TAB_COUNT}%`,
              transform: `translate3d(${activeIndex * 100}%, 0, 0)`,
            }}
            aria-hidden
          >
            <div className="bottom-nav-v2-pill-inner mx-1 h-full rounded-[1.05rem]" />
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
                onClick={() => navigate(href, index)}
                className={cn(
                  "bottom-nav-v2-tab relative z-10 flex flex-1 flex-col items-center justify-center gap-1",
                  "min-h-[58px] min-w-0 px-0.5 py-2.5 touch-manipulation select-none",
                  "active:scale-[0.96] transition-transform duration-100 ease-out transform-gpu",
                  active
                    ? "bottom-nav-v2-tab--active text-accent"
                    : "text-zinc-500"
                )}
                aria-current={active ? "page" : undefined}
                aria-label={label}
              >
                <span
                  className={cn(
                    "bottom-nav-v2-icon inline-flex items-center justify-center transform-gpu",
                    active && "bottom-nav-v2-icon--active",
                    bouncing && "bottom-nav-v2-icon--bounce"
                  )}
                >
                  <Icon
                    className={cn("h-[26px] w-[26px]", active && "stroke-[2.4]")}
                    strokeWidth={active ? 2.4 : 1.9}
                    aria-hidden
                  />
                </span>
                <span
                  className={cn(
                    "bottom-nav-v2-label truncate max-w-[4.75rem] text-center leading-tight",
                    active
                      ? "text-[11px] font-semibold opacity-100"
                      : "text-[10px] font-medium opacity-70"
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
