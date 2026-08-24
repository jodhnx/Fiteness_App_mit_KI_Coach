"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
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
        // Same tab re-tap → scroll to top
        window.scrollTo(0, 0);
        document.documentElement.scrollTop = 0;
        document.body.scrollTop = 0;
        return;
      }
      router.prefetch(href);
      router.push(href, { scroll: false });
    },
    [pathname, router]
  );

  // Reset window scroll BEFORE paint when switching main tabs (no jump flash)
  useLayoutEffect(() => {
    const tab = matchMainTab(pathname);
    if (!tab) {
      prevMainTab.current = null;
      return;
    }
    if (prevMainTab.current !== null && prevMainTab.current !== tab) {
      window.scrollTo(0, 0);
      document.documentElement.scrollTop = 0;
      document.body.scrollTop = 0;
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

function isRenderablePanel(node: ReactNode): boolean {
  return node != null && node !== false;
}

/**
 * Keep-alive for main tabs — revisiting shows cached tree instantly.
 * First visit renders live `children`; after mount the tree is frozen in cache.
 */
export function TabKeepAliveOutlet({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const keepActive = pathname != null && PATH_KEEP_ALIVE.has(pathname);
  const panels = useRef<Map<string, ReactNode>>(new Map());
  const [readyPaths, setReadyPaths] = useState<Set<string>>(() => new Set());

  useLayoutEffect(() => {
    if (!keepActive || !pathname || !isRenderablePanel(children)) return;
    panels.current.set(pathname, children);
    setReadyPaths((prev) => {
      if (prev.has(pathname)) return prev;
      const next = new Set(prev);
      next.add(pathname);
      return next;
    });
  }, [keepActive, pathname, children]);

  useEffect(() => {
    const clear = () => {
      panels.current.clear();
      setReadyPaths(new Set());
    };
    window.addEventListener("nexform:user-state-cleared", clear);
    return () => window.removeEventListener("nexform:user-state-cleared", clear);
  }, []);

  if (!keepActive || !pathname) {
    return <AppErrorBoundary label="page">{children}</AppErrorBoundary>;
  }

  const cached = panels.current.get(pathname);
  const hasCached = readyPaths.has(pathname) && isRenderablePanel(cached);
  const visible = hasCached ? cached : children;

  return (
    <>
      {[...PATH_KEEP_ALIVE].map((path) => {
        if (path === pathname) return null;
        const node = panels.current.get(path);
        if (!node || !readyPaths.has(path)) return null;
        return (
          <div key={path} hidden aria-hidden style={{ display: "none" }}>
            <AppErrorBoundary label={`keep:${path}`}>{node}</AppErrorBoundary>
          </div>
        );
      })}
      <div>
        <AppErrorBoundary label={`keep:${pathname}`}>{visible}</AppErrorBoundary>
      </div>
    </>
  );
}
