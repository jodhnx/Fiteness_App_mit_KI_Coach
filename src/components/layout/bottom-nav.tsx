"use client";

import { memo, useCallback, useEffect, useState } from "react";
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

const ITEMS = PRIMARY_NAV as ReadonlyArray<{
  href: MainTab;
  label: string;
  icon: (typeof PRIMARY_NAV)[number]["icon"];
}>;

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
  const [optimisticTab, setOptimisticTab] = useState<MainTab | null>(null);

  const activeHref =
    optimisticTab ??
    tabNav?.activeTab ??
    matchMainTab(pathname) ??
    (ITEMS.find((item) => isNavActive(pathname, item.href))?.href as
      | MainTab
      | undefined) ??
    "/home";

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

  if (shouldHideBottomNav(pathname)) return null;

  return (
    <nav
      className="bottom-nav-ios fixed bottom-0 left-0 right-0 z-50 lg:hidden"
      aria-label="Hauptnavigation"
      data-no-tab-swipe
    >
      <div className="bottom-nav-ios-inner mx-auto w-full max-w-[430px] px-1 pb-[max(0.25rem,env(safe-area-inset-bottom))]">
        <div className="bottom-nav-ios-bar flex items-stretch">
          {ITEMS.map(({ href, label, icon: Icon }) => {
            const active = activeHref === href;
            return (
              <button
                key={href}
                type="button"
                onPointerEnter={() => warmIntent(href)}
                onFocus={() => warmIntent(href)}
                onClick={() => navigate(href)}
                className={cn(
                  "bottom-nav-ios-tab flex flex-1 flex-col items-center justify-center gap-1",
                  "min-h-[2.75rem] min-w-0 px-1 py-1.5 touch-manipulation select-none",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40 rounded-lg",
                  active ? "bottom-nav-ios-tab--active" : "bottom-nav-ios-tab--idle"
                )}
                aria-current={active ? "page" : undefined}
                aria-label={label}
              >
                <Icon
                  className={cn(
                    "h-6 w-6 shrink-0 transition-colors",
                    active ? "text-accent" : "text-zinc-500"
                  )}
                  strokeWidth={active ? 2.25 : 1.85}
                  aria-hidden
                />
                <span
                  className={cn(
                    "bottom-nav-ios-label truncate max-w-[4.75rem] text-center leading-none",
                    active ? "text-accent font-semibold" : "text-zinc-500 font-medium"
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
