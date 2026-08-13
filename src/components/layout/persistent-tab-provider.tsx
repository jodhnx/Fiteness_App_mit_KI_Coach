"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { usePathname, useRouter } from "next/navigation";

export const MAIN_TABS = [
  "/home",
  "/workouts",
  "/nutrition",
  "/progress",
  "/coach",
] as const;

export type MainTab = (typeof MAIN_TABS)[number];

export function matchMainTab(pathname: string): MainTab | null {
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
};

const TabNavContext = createContext<TabNavContextValue | null>(null);

export function useMainTabNav() {
  return useContext(TabNavContext);
}

/**
 * Keeps visited main-tab trees mounted (hidden) so returning to a tab paints
 * the last real screen instantly — no intermediate loading preview.
 */
export function PersistentTabProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const routeTab = matchMainTab(pathname);
  const [optimisticTab, setOptimisticTab] = useState<MainTab | null>(null);
  const cacheRef = useRef<Partial<Record<MainTab, ReactNode>>>({});
  const [, bump] = useState(0);

  const activeTab = optimisticTab ?? routeTab;

  useEffect(() => {
    if (optimisticTab && routeTab === optimisticTab) {
      setOptimisticTab(null);
    }
  }, [routeTab, optimisticTab]);

  // Cache only when URL has settled on this tab (never overwrite with foreign children)
  if (routeTab && (!optimisticTab || optimisticTab === routeTab) && children != null) {
    if (cacheRef.current[routeTab] !== children) {
      cacheRef.current[routeTab] = children;
    }
  }

  const navigateMainTab = useCallback(
    (href: MainTab) => {
      setOptimisticTab(href);
      bump((n) => n + 1);
      router.prefetch(href);
      router.push(href);
    },
    [router]
  );

  const value: TabNavContextValue = { activeTab, navigateMainTab };

  return (
    <TabNavContext.Provider value={value}>
      {MAIN_TABS.map((tab) => {
        const panel = cacheRef.current[tab];
        const isActive = activeTab === tab;
        // Prefer cached real screen; only use live children when route matches this tab
        const content =
          panel ?? (isActive && routeTab === tab ? children : null);
        if (!content) return null;
        return (
          <div
            key={tab}
            hidden={!isActive}
            aria-hidden={!isActive}
            style={isActive ? undefined : { display: "none" }}
          >
            {content}
          </div>
        );
      })}
      {activeTab == null ? children : null}
    </TabNavContext.Provider>
  );
}
