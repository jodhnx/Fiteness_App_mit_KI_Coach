/**
 * Cache-first boot that only dismisses splash when Home + Nutrition are ready.
 * No artificial delay — finishes as soon as critical data is applied.
 */

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

/** Absolute last-resort only — prefer finishing when critical data is ready. */
const BOOT_HARD_CAP_MS = 4_000;

async function fetchOk(url: string) {
  const res = await fetch(url, { credentials: "same-origin" });
  if (!res.ok) return null;
  return res.json();
}

function isHomePayloadUsable(home: unknown): home is HomeDataPayload {
  if (!home || typeof home !== "object") return false;
  const h = home as HomeDataPayload;
  // Targets may be 0 before profile is complete — still usable if structure exists
  return (
    typeof h.calorieTarget === "number" &&
    typeof h.caloriesIntake === "number" &&
    typeof h.proteinConsumed === "number"
  );
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
  return isHomePayloadUsable(home) && dashOk;
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

function applyBootPayloads(
  home: unknown,
  dash: unknown,
  profile: unknown
): boolean {
  let ok = false;
  if (isHomePayloadUsable(home)) {
    applyHomePayload(home);
    ok = true;
  }
  if (
    dash &&
    isValidDashboardPayload(dash) &&
    isNutritionDashboardToday((dash as NutritionDashboardPayload).date)
  ) {
    publishNutritionDashboard(
      normalizeNutritionDashboard(dash as NutritionDashboardPayload)
    );
    ok = true;
  }
  if (
    profile &&
    ((profile as ProfileServerPrefetch).user ||
      (profile as ProfileServerPrefetch).profile)
  ) {
    setCached(PROFILE_CACHE_KEY, profile, 900_000);
  }
  return ok && hasCriticalHomeReady();
}

/**
 * Only dismiss splash once Home + today's nutrition are in cache.
 * Warm path = instant; cold path waits for parallel fetch (no early timeout hide).
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
  const [homeReady, setHomeReady] = useState(() => {
    if (typeof window === "undefined") return false;
    return hasBootSplashCompleted() || hasCriticalHomeReady();
  });

  useEffect(() => {
    if (hasBootSplashCompleted() && hasCriticalHomeReady()) {
      setSplashVisible(false);
      setHomeReady(true);
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
      setHomeReady(true);
      return;
    }

    if (!userId) return;
    if (loadedFor.current === userId) {
      if (!hasBootSplashCompleted() && hasCriticalHomeReady()) {
        markBootSplashCompleted();
        setSplashVisible(false);
        setHomeReady(true);
      }
      return;
    }
    if (booting.current) return;
    booting.current = true;
    loadedFor.current = userId;

    let cancelled = false;
    let finished = false;

    const finish = (opts?: { force?: boolean }) => {
      if (cancelled || finished) return;
      const ready = hasCriticalHomeReady();
      if (!ready && !opts?.force) return;
      finished = true;
      setBootProgress(1);
      markBootSplashCompleted();
      setHomeReady(true);
      setSplashVisible(false);
      warmNavDataCaches();
      warmFoodHistoryCache();
      booting.current = false;
    };

    const owner = getCacheOwner();
    if (!(owner && owner !== userId)) {
      bindCacheOwner(userId);
      hydratePersistentCaches(userId);
    }

    if (hasCriticalHomeReady()) {
      setBootProgress(0.9);
      finish();
      void Promise.all([
        fetchOk("/api/home"),
        fetchOk("/api/nutrition/dashboard"),
        fetchOk("/api/profile"),
      ]).then(([home, dash, profile]) => {
        if (cancelled) return;
        applyBootPayloads(home, dash, profile);
      });
      void Promise.all([
        fetchOk("/api/progress"),
        fetchOk("/api/workouts/sessions?active=1"),
        fetchOk("/api/workouts/recovery"),
        fetchOk("/api/gamification"),
      ]).then(([progress, active, recovery, gamification]) => {
        if (progress) setCached(PROGRESS_CACHE_KEY, progress, 600_000);
        if (active) setCached("workouts-active", active, 180_000);
        if (recovery) setCached("workouts-recovery-hub", recovery, 120_000);
        if (gamification) setCached("gamification-full", gamification, 120_000);
      });
      return;
    }

    // Hard cap only forces show if network hung — still better than infinite splash
    const deadline = window.setTimeout(() => finish({ force: true }), BOOT_HARD_CAP_MS);

    void (async () => {
      try {
        setBootProgress(0.3);
        const [home, dash, profile] = await Promise.all([
          fetchOk("/api/home"),
          fetchOk("/api/nutrition/dashboard"),
          fetchOk("/api/profile"),
        ]);
        if (cancelled) return;
        setBootProgress(0.75);
        applyBootPayloads(home, dash, profile);
        setBootProgress(0.95);
        finish({ force: !hasCriticalHomeReady() });

        void Promise.all([
          fetchOk("/api/progress"),
          fetchOk("/api/workouts/sessions?active=1"),
          fetchOk("/api/workouts/recovery"),
          fetchOk("/api/recipes/catalog?limit=24&page=1"),
          fetchOk("/api/gamification"),
        ]).then(async ([progress, active, recovery, recipes, gamification]) => {
          if (cancelled) return;
          if (progress) setCached(PROGRESS_CACHE_KEY, progress, 600_000);
          if (active) setCached("workouts-active", active, 180_000);
          if (recovery) setCached("workouts-recovery-hub", recovery, 120_000);
          if (gamification) setCached("gamification-full", gamification, 120_000);
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
        finish({ force: true });
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
          {/* Hold shell paint until first critical home payload is ready */}
          {homeReady || !splashVisible ? (
            <AppShell>{children}</AppShell>
          ) : (
            <div className="min-h-dvh bg-zinc-950" aria-hidden />
          )}
        </HomeDataProvider>
      </NutritionDataProvider>
    </ProfileDataProvider>
  );
}
