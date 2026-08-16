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

export const MAIN_TABS = [
  "/home",
  "/workouts",
  "/nutrition",
  "/progress",
  "/coach",
] as const;

export type MainTab = (typeof MAIN_TABS)[number];

/** Exact paths kept mounted so returning is instant (no remount / refetch flash). */
const PATH_KEEP_ALIVE = new Set<string>([
  "/home",
  "/workouts",
  "/nutrition",
  "/progress",
  "/coach",
  "/rezepte",
  "/geraete",
  "/erfolge",
  "/social",
]);

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

  const navigateMainTab = useCallback(
    (href: MainTab) => {
      if (pathname === href) return;
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

/**
 * Keep-alive for exact page trees (Home, Nutrition, Recipes list, Coach, …).
 * Detail routes (e.g. /rezepte/[id]) render normally while the list stays mounted.
 */
export function TabKeepAliveOutlet({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const keepActive = pathname != null && PATH_KEEP_ALIVE.has(pathname);
  const panels = useRef<Map<string, ReactNode>>(new Map());

  if (keepActive && pathname && !panels.current.has(pathname)) {
    panels.current.set(pathname, children);
  }

  useEffect(() => {
    const clear = () => {
      panels.current.clear();
    };
    window.addEventListener("nexform:user-state-cleared", clear);
    return () => window.removeEventListener("nexform:user-state-cleared", clear);
  }, []);

  return (
    <>
      {[...PATH_KEEP_ALIVE].map((path) => {
        const node = panels.current.get(path);
        if (!node) return null;
        const show = keepActive && pathname === path;
        return (
          <div
            key={path}
            hidden={!show}
            aria-hidden={!show}
            style={show ? undefined : { display: "none" }}
          >
            <AppErrorBoundary label={`keep:${path}`}>{node}</AppErrorBoundary>
          </div>
        );
      })}
      {!keepActive ? (
        <AppErrorBoundary label="page">{children}</AppErrorBoundary>
      ) : null}
    </>
  );
}
