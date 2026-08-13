"use client";

import { memo, useCallback } from "react";
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
} from "@/components/layout/persistent-tab-provider";

const ITEMS = [
  { href: "/home", label: "Home", icon: Home },
  { href: "/workouts", label: "Training", icon: Dumbbell },
  { href: "/nutrition", label: "Ernährung", icon: Apple },
  { href: "/progress", label: "Fortschritt", icon: TrendingUp },
  { href: "/coach", label: "Coach", icon: Bot },
] as const satisfies ReadonlyArray<{ href: MainTab; label: string; icon: typeof Home }>;

function shouldHideBottomNav(pathname: string) {
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

  const warmIntent = useCallback(
    (href: string) => {
      router.prefetch(href);
      if (href === "/progress") warmProgressCache();
      else warmNavDataCaches();
    },
    [router]
  );

  const navigate = useCallback(
    (href: MainTab) => {
      if (tabNav?.activeTab === href || isNavActive(pathname, href)) return;
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
    [pathname, router, tabNav]
  );

  if (shouldHideBottomNav(pathname)) return null;

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 lg:hidden border-t border-white/10 bg-zinc-950/98 backdrop-blur-xl safe-area-pb transform-gpu"
      aria-label="Hauptnavigation"
    >
      <div className="mx-auto w-full max-w-[430px] flex items-stretch justify-between px-1 pt-1 pb-1.5">
        {ITEMS.map(({ href, label, icon: Icon }) => {
          const active =
            tabNav?.activeTab === href || isNavActive(pathname, href);
          return (
            <button
              key={href}
              type="button"
              onPointerEnter={() => warmIntent(href)}
              onFocus={() => warmIntent(href)}
              onTouchStart={() => warmIntent(href)}
              onClick={() => navigate(href)}
              className={cn(
                "flex flex-1 flex-col items-center gap-0.5 py-2 min-h-[52px] text-[11px] font-medium transition-colors duration-75 active:scale-95 transform-gpu",
                active ? "text-accent" : "text-zinc-500"
              )}
              aria-current={active ? "page" : undefined}
            >
              <Icon
                className={cn("h-6 w-6", active && "stroke-[2.5]")}
                strokeWidth={active ? 2.5 : 2}
              />
              <span className="truncate max-w-[72px]">{label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
});
