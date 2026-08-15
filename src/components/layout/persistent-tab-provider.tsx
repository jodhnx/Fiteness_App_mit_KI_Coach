"use client";

import {
  createContext,
  useCallback,
  useContext,
  useTransition,
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
  isPending: boolean;
};

const TabNavContext = createContext<TabNavContextValue | null>(null);

export function useMainTabNav() {
  return useContext(TabNavContext);
}

/**
 * Stable tab navigation — does NOT cache React trees across routes.
 * Caching children caused client-side crashes ("Etwas ist schiefgelaufen")
 * when stale/hidden page trees threw during session/cache updates.
 *
 * Instant feel comes from: no route loading.tsx, router cache (staleTimes),
 * prefetch, and client data caches — not from keeping dead route trees alive.
 */
export function PersistentTabProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const activeTab = matchMainTab(pathname);

  const navigateMainTab = useCallback(
    (href: MainTab) => {
      if (matchMainTab(pathname) === href) return;
      router.prefetch(href);
      startTransition(() => {
        router.push(href);
      });
    },
    [pathname, router]
  );

  return (
    <TabNavContext.Provider value={{ activeTab, navigateMainTab, isPending }}>
      {children}
    </TabNavContext.Provider>
  );
}
