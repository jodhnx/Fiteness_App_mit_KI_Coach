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
  PROFILE_CACHE_KEY,
} from "@/lib/nutrition-sync";
import { setCached } from "@/lib/client-cache";
import {
  isValidDashboardPayload,
  normalizeNutritionDashboard,
} from "@/lib/nutrition-defaults";
import { isNutritionDashboardToday } from "@/lib/nutrition-day";
import { normalizeHomeData } from "@/lib/home-defaults";
import { warmNavDataCaches } from "@/lib/nav-cache-warmer";
import { warmFoodHistoryCache } from "@/lib/food-history-cache";
import { PROGRESS_CACHE_KEY } from "@/lib/progress-cache";

/** Hard cap — never block the UI longer than this (not a minimum). */
const BOOT_MAX_MS = 2_800;

async function fetchOk(url: string) {
  const res = await fetch(url, { credentials: "same-origin" });
  if (!res.ok) return null;
  return res.json();
}

/**
 * Stable app shell — one-shot boot ≤3s, parallel critical data.
 * Never remounts providers on menu switches.
 */
export function AppClientShell({ children }: { children: ReactNode }) {
  const { data: session, status } = useSession();
  const userId = session?.user?.id ?? null;
  const loadedFor = useRef<string | null>(null);
  const booting = useRef(false);

  const [splashVisible, setSplashVisible] = useState(true);
  const [bootProgress, setBootProgress] = useState(0.08);

  useEffect(() => {
    if (hasBootSplashCompleted()) {
      setSplashVisible(false);
      setBootProgress(1);
    }
  }, []);

  useEffect(() => {
    if (status === "loading") {
      setBootProgress((p) => Math.max(p, 0.12));
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

    const deadline = window.setTimeout(finish, BOOT_MAX_MS);

    void (async () => {
      try {
        setBootProgress(0.2);

        // Critical path: home + nutrition + profile in parallel
        const critical = Promise.all([
          fetchOk("/api/home"),
          fetchOk("/api/nutrition/dashboard"),
          fetchOk("/api/profile"),
        ]).then(([home, dash, profile]) => {
          if (cancelled) return;
          setBootProgress(0.55);

          if (home) {
            setCached(HOME_DATA_CACHE_KEY, normalizeHomeData(home as HomeDataPayload), 900_000);
          }
          if (
            dash &&
            isValidDashboardPayload(dash) &&
            isNutritionDashboardToday((dash as NutritionDashboardPayload).date)
          ) {
            publishNutritionDashboard(
              normalizeNutritionDashboard(dash as NutritionDashboardPayload)
            );
          }
          if (profile && ((profile as ProfileServerPrefetch).user || (profile as ProfileServerPrefetch).profile)) {
            setCached(PROFILE_CACHE_KEY, profile, 900_000);
          }
          setBootProgress(0.75);
        });

        // Secondary: progress + workouts (don't block past deadline)
        const secondary = Promise.all([
          fetchOk("/api/progress"),
          fetchOk("/api/workouts/sessions?active=1"),
          fetchOk("/api/recipes/catalog?limit=24&page=1"),
        ]).then(([progress, active, recipes]) => {
          if (cancelled) return;
          if (progress) setCached(PROGRESS_CACHE_KEY, progress, 600_000);
          if (active) setCached("workouts-active", active, 180_000);
          if (recipes) setCached("recipe-catalog-page:1", recipes, 300_000);
        });

        await critical;
        if (!cancelled) finish();
        void secondary.catch(() => undefined);
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
