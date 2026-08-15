"use client";

import {
  createContext,
  useCallback,
  useContext,
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

/**
 * Stable tab navigation helpers. No React-tree caching (that caused crashes).
 * Instant switches = router cache + client data caches + no loading.tsx.
 */
export function PersistentTabProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const activeTab = matchMainTab(pathname);

  const navigateMainTab = useCallback(
    (href: MainTab) => {
      if (matchMainTab(pathname) === href) return;
      router.prefetch(href);
      router.push(href);
    },
    [pathname, router]
  );

  return (
    <TabNavContext.Provider
      value={{ activeTab, navigateMainTab, isPending: false }}
    >
      {children}
    </TabNavContext.Provider>
  );
}
