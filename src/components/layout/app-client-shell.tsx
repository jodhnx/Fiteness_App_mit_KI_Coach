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
import { runBootSecondaryPrefetch } from "@/lib/boot-prefetch";
import {
  initializeApp,
  isAppBootReady,
  readBootPayloadFromCache,
  type BootstrapPayload,
} from "@/lib/app-init";
import { bootPerfMark } from "@/lib/app-init-perf";
import { getCacheOwner, hydratePersistentCaches } from "@/lib/client-cache";

/** Safety only — never dismiss without data unless this elapses. */
const BOOT_SAFETY_CAP_MS = 10_000;

/** Defer background warm so Home can paint and stay interactive first. */
function schedulePostBootWarm() {
  if (typeof window === "undefined") return;
  // Two rAFs = after first paint
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      window.setTimeout(() => {
        warmNavDataCaches();
        runBootSecondaryPrefetch();
      }, 600);
    });
  });
}

/** Overlap session wait with disk hydrate — shaves one RTT on cold reopen. */
function earlyHydrateFromOwner() {
  if (typeof window === "undefined") return;
  const owner = getCacheOwner();
  if (!owner) return;
  hydratePersistentCaches(owner);
}

export function AppClientShell({ children }: { children: ReactNode }) {
  const { data: session, status } = useSession();
  const userId = session?.user?.id ?? null;
  const initFor = useRef<string | null>(null);
  const initRunning = useRef(false);

  const [bootPayload, setBootPayload] = useState<BootstrapPayload | null>(() => {
    earlyHydrateFromOwner();
    return typeof window !== "undefined" ? readBootPayloadFromCache() : null;
  });
  const [appReady, setAppReady] = useState(() =>
    typeof window !== "undefined" ? isAppBootReady() : false
  );
  const [splashVisible, setSplashVisible] = useState(() => !isAppBootReady());
  const [bootProgress, setBootProgress] = useState(() =>
    isAppBootReady() ? 1 : 0.12
  );

  // While auth is loading, keep hydrating soft-stale disk cache for instant warm path
  useEffect(() => {
    if (status !== "loading") return;
    earlyHydrateFromOwner();
    const cached = readBootPayloadFromCache();
    if (cached) {
      setBootPayload(cached);
      setBootProgress((p) => Math.max(p, 0.55));
    } else {
      setBootProgress((p) => Math.max(p, 0.2));
    }
  }, [status]);

  useEffect(() => {
    if (status === "loading") {
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
      schedulePostBootWarm();
      initFor.current = userId;
      initRunning.current = false;
      bootPerfMark("boot_ready");
    };

    bootPerfMark("auth_end");
    setBootProgress((p) => Math.max(p, 0.3));

    // Warm path: cache already usable → show Home immediately, refresh in background
    const cachedNow = readBootPayloadFromCache();
    if (cachedNow) {
      finish(cachedNow);
      void initializeApp(userId, (p) => {
        if (!cancelled) setBootProgress((prev) => Math.max(prev, p));
      });
      return () => {
        cancelled = true;
      };
    }

    void (async () => {
      safetyTimer = window.setTimeout(() => {
        if (!cancelled && !finished) {
          console.warn("[AppClientShell] boot safety cap — cache may be incomplete");
          finish(readBootPayloadFromCache());
        }
      }, BOOT_SAFETY_CAP_MS);

      const result = await initializeApp(userId, (p) => {
        if (!cancelled) setBootProgress((prev) => Math.max(prev, p));
      });
      if (cancelled) return;
      window.clearTimeout(safetyTimer);

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
