/**
 * Boot gate: splash stays until initializeApp() finishes.
 * Home never fetches its own data after mount — bootstrap owns the first load.
 */

"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { useSession } from "next-auth/react";
import { NutritionDataProvider } from "@/components/providers/nutrition-data-provider";
import { ProfileDataProvider } from "@/components/providers/profile-data-provider";
import { HomeDataProvider } from "@/components/providers/home-data-provider";
import { AppShell } from "@/components/layout/app-shell";
import { AppBootSplash } from "@/components/layout/app-boot-splash";
import { markBootSplashCompleted } from "@/lib/boot-splash";
import type { NutritionDashboardPayload } from "@/lib/nutrition-defaults";
import type { ProfileServerPrefetch } from "@/lib/profile-prefetch";
import type { HomeDataPayload } from "@/lib/home-defaults";
import { warmNavDataCaches } from "@/lib/nav-cache-warmer";
import { warmFoodHistoryCache } from "@/lib/food-history-cache";
import { prefetchProgressCharts } from "@/lib/progress-chart-prefetch";
import { runBootSecondaryPrefetch } from "@/lib/boot-prefetch";
import {
  initializeApp,
  isAppBootReady,
  readBootPayloadFromCache,
  type BootstrapPayload,
} from "@/lib/app-init";
import { bootPerfMark } from "@/lib/app-init-perf";

/** Safety only — never dismiss without data unless this elapses. */
const BOOT_SAFETY_CAP_MS = 15_000;

export function AppClientShell({ children }: { children: ReactNode }) {
  const { data: session, status } = useSession();
  const userId = session?.user?.id ?? null;
  const initFor = useRef<string | null>(null);
  const initRunning = useRef(false);

  const [bootPayload, setBootPayload] = useState<BootstrapPayload | null>(() =>
    typeof window !== "undefined" ? readBootPayloadFromCache() : null
  );
  const [appReady, setAppReady] = useState(() =>
    typeof window !== "undefined" ? isAppBootReady() : false
  );
  const [splashVisible, setSplashVisible] = useState(() => !isAppBootReady());
  const [bootProgress, setBootProgress] = useState(() =>
    isAppBootReady() ? 1 : 0.12
  );

  useEffect(() => {
    if (status === "loading") {
      setBootProgress((p) => Math.max(p, 0.15));
      return;
    }

    if (status === "unauthenticated") {
      initFor.current = null;
      setSplashVisible(false);
      setAppReady(true);
      return;
    }

    if (!userId) return;

    if (initFor.current === userId) return;
    if (initRunning.current) return;
    initRunning.current = true;

    let cancelled = false;
    let finished = false;
    let safetyTimer = 0;

    const finish = (payload: BootstrapPayload | null) => {
      if (cancelled || finished) return;
      finished = true;
      if (payload) setBootPayload(payload);
      setBootProgress(1);
      setAppReady(true);
      setSplashVisible(false);
      markBootSplashCompleted();
      warmNavDataCaches();
      warmFoodHistoryCache();
      runBootSecondaryPrefetch();
      if (payload?.progress) void prefetchProgressCharts(true);
      initFor.current = userId;
      initRunning.current = false;
      bootPerfMark("boot_ready");
    };

    bootPerfMark("auth_end");
    setBootProgress(0.25);

    void (async () => {
      safetyTimer = window.setTimeout(() => {
        if (!cancelled && !finished) {
          console.warn("[AppClientShell] boot safety cap — cache may be incomplete");
          finish(readBootPayloadFromCache());
        }
      }, BOOT_SAFETY_CAP_MS);

      const result = await initializeApp(userId);
      if (cancelled) return;
      window.clearTimeout(safetyTimer);
      setBootProgress(0.92);

      if (result.payload) {
        finish(result.payload);
        return;
      }

      console.error("[AppClientShell] boot failed — no payload");
      finish(null);
    })();

    return () => {
      cancelled = true;
      window.clearTimeout(safetyTimer);
    };
  }, [userId, status]);

  const initialHome: HomeDataPayload | null = bootPayload?.home ?? null;
  const initialNutrition: NutritionDashboardPayload | null =
    bootPayload?.nutrition ?? null;
  const initialProfile: ProfileServerPrefetch | null = bootPayload?.profile ?? null;

  return (
    <ProfileDataProvider initialProfile={initialProfile}>
      <NutritionDataProvider initialDashboard={initialNutrition}>
        <HomeDataProvider initialHome={initialHome}>
          <AppBootSplash progress={bootProgress} visible={splashVisible} />
          {appReady ? (
            <AppShell>{children}</AppShell>
          ) : (
            <div className="min-h-dvh gradient-mesh" aria-hidden />
          )}
        </HomeDataProvider>
      </NutritionDataProvider>
    </ProfileDataProvider>
  );
}
