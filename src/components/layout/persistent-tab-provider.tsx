"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  type ReactNode,
} from "react";
import { usePathname, useRouter } from "next/navigation";
import { AppErrorBoundary } from "@/components/layout/app-error-boundary";
import { scrollMainTabToTop } from "@/components/layout/scroll-restore-provider";
import {
  buildScrollKeyNormalized,
  saveScrollPosition,
} from "@/lib/scroll-restore";

export const MAIN_TABS = [
  "/home",
  "/workouts",
  "/nutrition",
  "/progress",
  "/more",
] as const;

export type MainTab = (typeof MAIN_TABS)[number];

/** Exact main-tab paths (nav + soft switch). */
const PATH_KEEP_ALIVE = new Set<string>([...MAIN_TABS]);

export function matchMainTab(pathname: string | null): MainTab | null {
  if (!pathname) return null;
  if (
    pathname.includes("/workouts/live/") ||
    pathname.includes("/nutrition/add/") ||
    pathname.includes("/workouts/exercises/pick")
  ) {
    return null;
  }
  for (const tab of MAIN_TABS) {
    if (pathname === tab) return tab;
    if (tab !== "/home" && pathname.startsWith(`${tab}/`)) return tab;
  }
  return null;
}

type TabNavContextValue = {
  activeTab: MainTab | null;
  navigateMainTab: (href: MainTab) => void;
  isPending: boolean;
};

const TabNavContext = createContext<TabNavContextValue | null>(null);

export function useMainTabNav() {
  return useContext(TabNavContext);
}

/** Nav helpers only — wrap the whole shell so BottomNav can navigate. */
export function PersistentTabProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const activeTab = matchMainTab(pathname);
  const prevMainTab = useRef<MainTab | null>(null);

  const navigateMainTab = useCallback(
    (href: MainTab) => {
      if (pathname === href) {
        // Same tab re-tap → intentional top (clears stored position)
        scrollMainTabToTop(href);
        return;
      }
      // Persist leaving tab scroll before soft navigation
      saveScrollPosition(
        buildScrollKeyNormalized(
          pathname,
          typeof window !== "undefined" ? window.location.search : ""
        )
      );
      router.prefetch(href);
      router.push(href, { scroll: false });
    },
    [pathname, router]
  );

  useEffect(() => {
    const tab = matchMainTab(pathname);
    if (!tab) {
      prevMainTab.current = null;
      return;
    }
    prevMainTab.current = tab;
  }, [pathname]);

  return (
    <TabNavContext.Provider
      value={{ activeTab, navigateMainTab, isPending: false }}
    >
      {children}
    </TabNavContext.Provider>
  );
}

/**
 * Main-tab outlet.
 *
 * IMPORTANT (Next.js App Router / RSC): Do NOT freeze and re-parent `children`.
 * Caching the RSC payload and rendering it beside the live tree duplicates page
 * DOM (e.g. two Nutrition layouts — one hidden). Instant tab UX comes from
 * cache-first data providers + soft navigation, not from freezing RSC nodes.
 */
export function TabKeepAliveOutlet({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const keepActive = pathname != null && PATH_KEEP_ALIVE.has(pathname);

  return (
    <div
      className="nf-keep-alive"
      data-path={pathname ?? undefined}
      data-keep-mode={keepActive ? "live" : "page"}
    >
      <AppErrorBoundary label={keepActive && pathname ? `keep:${pathname}` : "page"}>
        {children}
      </AppErrorBoundary>
    </div>
  );
}
