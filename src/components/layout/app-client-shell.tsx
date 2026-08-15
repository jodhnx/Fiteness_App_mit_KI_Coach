"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { useSession } from "next-auth/react";
import { NutritionDataProvider } from "@/components/providers/nutrition-data-provider";
import { ProfileDataProvider } from "@/components/providers/profile-data-provider";
import { HomeDataProvider } from "@/components/providers/home-data-provider";
import { AppShell } from "@/components/layout/app-shell";
import {
  AppBootSplash,
} from "@/components/layout/app-boot-splash";
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

/**
 * Stable app shell — one-shot boot splash on cold open only.
 * Never remounts providers on menu switches.
 */
export function AppClientShell({ children }: { children: ReactNode }) {
  const { data: session, status } = useSession();
  const userId = session?.user?.id ?? null;
  const loadedFor = useRef<string | null>(null);
  const booting = useRef(false);

  // Assume splash until we know this session already finished boot (avoids home flash)
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
    let steps = 0;
    const TOTAL = 4;
    const tick = () => {
      steps += 1;
      if (!cancelled) setBootProgress(Math.min(0.95, steps / TOTAL));
    };

    void (async () => {
      try {
        setBootProgress(0.22);

        const [homeRes, dashRes, profileRes] = await Promise.all([
          fetch("/api/home", { credentials: "same-origin" }),
          fetch("/api/nutrition/dashboard", { credentials: "same-origin" }),
          fetch("/api/profile", { credentials: "same-origin" }),
        ]);

        if (cancelled) return;
        tick();

        if (homeRes.ok) {
          const home = (await homeRes.json()) as HomeDataPayload;
          setCached(HOME_DATA_CACHE_KEY, normalizeHomeData(home), 120_000);
        }
        tick();

        if (dashRes.ok) {
          const dash = (await dashRes.json()) as NutritionDashboardPayload;
          if (
            isValidDashboardPayload(dash) &&
            isNutritionDashboardToday(dash.date)
          ) {
            publishNutritionDashboard(normalizeNutritionDashboard(dash));
          }
        }
        tick();

        if (profileRes.ok) {
          const profile = (await profileRes.json()) as ProfileServerPrefetch;
          if (profile?.user || profile?.profile) {
            setCached(PROFILE_CACHE_KEY, profile, 120_000);
          }
        }
        tick();
      } catch (e) {
        console.error("[AppClientShell] boot load failed", e);
      } finally {
        if (!cancelled) {
          setBootProgress(1);
          markBootSplashCompleted();
          setSplashVisible(false);
          // Background warm — never blocks splash
          warmNavDataCaches();
          warmFoodHistoryCache();
        }
        booting.current = false;
      }
    })();

    return () => {
      cancelled = true;
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
