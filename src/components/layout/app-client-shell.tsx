"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { useSession } from "next-auth/react";
import { NutritionDataProvider } from "@/components/providers/nutrition-data-provider";
import { ProfileDataProvider } from "@/components/providers/profile-data-provider";
import { HomeDataProvider } from "@/components/providers/home-data-provider";
import { AppShell } from "@/components/layout/app-shell";
import { AppBootSplash } from "@/components/layout/app-boot-splash";
import {
  hasBootSplashCompleted,
  markBootSplashCompleted,
} from "@/lib/boot-splash";
import type { NutritionDashboardPayload } from "@/lib/nutrition-defaults";
import type { ProfileServerPrefetch } from "@/lib/profile-prefetch";
import type { HomeDataPayload } from "@/lib/home-defaults";
import {
  publishNutritionDashboard,
  HOME_DATA_CACHE_KEY,
  HOME_DATA_EVENT,
  NUTRITION_DASHBOARD_CACHE_KEY,
  PROFILE_CACHE_KEY,
} from "@/lib/nutrition-sync";
import {
  bindCacheOwner,
  getCached,
  getCacheOwner,
  hydratePersistentCaches,
  setCached,
} from "@/lib/client-cache";
import {
  isValidDashboardPayload,
  normalizeNutritionDashboard,
} from "@/lib/nutrition-defaults";
import { isNutritionDashboardToday } from "@/lib/nutrition-day";
import { normalizeHomeData } from "@/lib/home-defaults";
import { warmNavDataCaches } from "@/lib/nav-cache-warmer";
import { warmFoodHistoryCache } from "@/lib/food-history-cache";
import { PROGRESS_CACHE_KEY } from "@/lib/progress-cache";

/** Absolute max — prefer finishing earlier when cache or critical data is ready. */
const BOOT_MAX_MS = 900;

async function fetchOk(url: string) {
  const res = await fetch(url, { credentials: "same-origin" });
  if (!res.ok) return null;
  return res.json();
}

function hasCriticalHomeReady(): boolean {
  const home = getCached(HOME_DATA_CACHE_KEY, { allowStale: true });
  const dash = getCached<NutritionDashboardPayload>(NUTRITION_DASHBOARD_CACHE_KEY, {
    allowStale: true,
  });
  const dashOk =
    dash != null &&
    isValidDashboardPayload(dash) &&
    isNutritionDashboardToday(dash.date);
  return home != null && dashOk;
}

function applyHomePayload(home: HomeDataPayload) {
  const normalized = normalizeHomeData(home);
  setCached(HOME_DATA_CACHE_KEY, normalized, 900_000);
  if (typeof window !== "undefined") {
    window.dispatchEvent(
      new CustomEvent(HOME_DATA_EVENT, { detail: normalized })
    );
  }
}

/**
 * Cache-first boot: if this account already has Home+Nutrition cached,
 * show the app immediately and refresh in the background.
 */
export function AppClientShell({ children }: { children: ReactNode }) {
  const { data: session, status } = useSession();
  const userId = session?.user?.id ?? null;
  const loadedFor = useRef<string | null>(null);
  const booting = useRef(false);

  const [splashVisible, setSplashVisible] = useState(() => {
    if (typeof window === "undefined") return true;
    return !hasBootSplashCompleted();
  });
  const [bootProgress, setBootProgress] = useState(0.1);

  useEffect(() => {
    if (hasBootSplashCompleted()) {
      setSplashVisible(false);
      setBootProgress(1);
    }
  }, []);

  useEffect(() => {
    if (status === "loading") {
      setBootProgress((p) => Math.max(p, 0.15));
      return;
    }

    if (status === "unauthenticated") {
      loadedFor.current = null;
      setSplashVisible(false);
      return;
    }

    if (!userId) return;
    if (loadedFor.current === userId) {
      if (!hasBootSplashCompleted()) {
        markBootSplashCompleted();
        setSplashVisible(false);
      }
      return;
    }
    if (booting.current) return;
    booting.current = true;
    loadedFor.current = userId;

    let cancelled = false;
    let finished = false;

    const finish = () => {
      if (cancelled || finished) return;
      finished = true;
      setBootProgress(1);
      markBootSplashCompleted();
      setSplashVisible(false);
      warmNavDataCaches();
      warmFoodHistoryCache();
      booting.current = false;
    };

    // Bind + hydrate disk cache for THIS user before deciding to wait
    const owner = getCacheOwner();
    if (owner && owner !== userId) {
      /* SessionCacheGuard clears on mismatch; don't hydrate foreign data */
    } else {
      bindCacheOwner(userId);
      hydratePersistentCaches(userId);
    }

    // Warm path: cached Home already usable → show app now
    if (hasCriticalHomeReady()) {
      setBootProgress(0.85);
      finish();
      // Background refresh (non-blocking)
      void Promise.all([
        fetchOk("/api/home"),
        fetchOk("/api/nutrition/dashboard"),
        fetchOk("/api/profile"),
      ]).then(([home, dash, profile]) => {
        if (cancelled) return;
        if (home) applyHomePayload(home as HomeDataPayload);
        if (
          dash &&
          isValidDashboardPayload(dash) &&
          isNutritionDashboardToday((dash as NutritionDashboardPayload).date)
        ) {
          publishNutritionDashboard(
            normalizeNutritionDashboard(dash as NutritionDashboardPayload)
          );
        }
        if (
          profile &&
          ((profile as ProfileServerPrefetch).user ||
            (profile as ProfileServerPrefetch).profile)
        ) {
          setCached(PROFILE_CACHE_KEY, profile, 900_000);
        }
      });
      void Promise.all([
        fetchOk("/api/progress"),
        fetchOk("/api/workouts/sessions?active=1"),
      ]).then(([progress, active]) => {
        if (progress) setCached(PROGRESS_CACHE_KEY, progress, 600_000);
        if (active) setCached("workouts-active", active, 180_000);
      });
      return;
    }

    const deadline = window.setTimeout(finish, BOOT_MAX_MS);

    void (async () => {
      try {
        setBootProgress(0.25);

        const [home, dash, profile] = await Promise.all([
          fetchOk("/api/home"),
          fetchOk("/api/nutrition/dashboard"),
          fetchOk("/api/profile"),
        ]);

        if (cancelled) return;
        setBootProgress(0.7);

        if (home) applyHomePayload(home as HomeDataPayload);
        if (
          dash &&
          isValidDashboardPayload(dash) &&
          isNutritionDashboardToday((dash as NutritionDashboardPayload).date)
        ) {
          publishNutritionDashboard(
            normalizeNutritionDashboard(dash as NutritionDashboardPayload)
          );
        }
        if (
          profile &&
          ((profile as ProfileServerPrefetch).user ||
            (profile as ProfileServerPrefetch).profile)
        ) {
          setCached(PROFILE_CACHE_KEY, profile, 900_000);
        }

        setBootProgress(0.9);
        finish();

        void Promise.all([
          fetchOk("/api/progress"),
          fetchOk("/api/workouts/sessions?active=1"),
          fetchOk("/api/recipes/catalog?limit=24&page=1"),
        ]).then(async ([progress, active, recipes]) => {
          if (cancelled) return;
          if (progress) setCached(PROGRESS_CACHE_KEY, progress, 600_000);
          if (active) setCached("workouts-active", active, 180_000);
          if (recipes) {
            const d = recipes as {
              recipes?: import("@/lib/recipes/catalog-query").RecipeListItem[];
              total?: number;
              catalogTotal?: number;
              page?: number;
              hasMore?: boolean;
              favoriteIds?: string[];
            };
            const { writeRecipeCatalogCache } = await import(
              "@/lib/recipe-catalog-cache"
            );
            writeRecipeCatalogCache({
              recipes: d.recipes ?? [],
              total: d.total ?? 0,
              catalogTotal: d.catalogTotal ?? d.total ?? 0,
              page: d.page ?? 1,
              hasMore: Boolean(d.hasMore),
              favoriteIds: d.favoriteIds ?? [],
              q: "",
              filters: [],
            });
          }
        });
      } catch (e) {
        console.error("[AppClientShell] boot load failed", e);
        finish();
      } finally {
        window.clearTimeout(deadline);
      }
    })();

    return () => {
      cancelled = true;
      window.clearTimeout(deadline);
    };
  }, [userId, status]);

  return (
    <ProfileDataProvider initialProfile={null}>
      <NutritionDataProvider initialDashboard={null}>
        <HomeDataProvider initialHome={null}>
          <AppBootSplash progress={bootProgress} visible={splashVisible} />
          <AppShell>{children}</AppShell>
        </HomeDataProvider>
      </NutritionDataProvider>
    </ProfileDataProvider>
  );
}
