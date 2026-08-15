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

const KEEP_ALIVE = new Set<MainTab>([
  "/home",
  "/workouts",
  "/nutrition",
  "/progress",
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
 * Keep-alive for main tab PAGE trees only (not header/nav).
 * Place around route `children` inside <main>.
 */
export function TabKeepAliveOutlet({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const activeTab = matchMainTab(pathname);
  const keepActive =
    activeTab != null && KEEP_ALIVE.has(activeTab) && pathname === activeTab;

  const panels = useRef<Partial<Record<MainTab, ReactNode>>>({});

  if (keepActive && activeTab && !panels.current[activeTab]) {
    panels.current[activeTab] = children;
  }

  useEffect(() => {
    const clear = () => {
      panels.current = {};
    };
    window.addEventListener("nexform:user-state-cleared", clear);
    return () => window.removeEventListener("nexform:user-state-cleared", clear);
  }, []);

  return (
    <>
      {MAIN_TABS.filter((t) => KEEP_ALIVE.has(t)).map((tab) => {
        const node = panels.current[tab];
        if (!node) return null;
        const show = keepActive && activeTab === tab;
        return (
          <div
            key={tab}
            hidden={!show}
            aria-hidden={!show}
            style={show ? undefined : { display: "none" }}
          >
            <AppErrorBoundary label={`tab:${tab}`}>{node}</AppErrorBoundary>
          </div>
        );
      })}
      {!keepActive ? (
        <AppErrorBoundary label="page">{children}</AppErrorBoundary>
      ) : null}
    </>
  );
}
