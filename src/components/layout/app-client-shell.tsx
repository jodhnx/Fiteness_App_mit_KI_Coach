/**
 * Cache-first app shell — NO splash / loading gate.
 * Home paints immediately from disk/memory cache; bootstrap refreshes in background.
 */

"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { useSession } from "next-auth/react";
import { NutritionDataProvider } from "@/components/providers/nutrition-data-provider";
import { ProfileDataProvider } from "@/components/providers/profile-data-provider";
import { HomeDataProvider } from "@/components/providers/home-data-provider";
import { AppShell } from "@/components/layout/app-shell";
import type { NutritionDashboardPayload } from "@/lib/nutrition-defaults";
import type { ProfileServerPrefetch } from "@/lib/profile-prefetch";
import type { HomeDataPayload } from "@/lib/home-defaults";
import { warmNavDataCaches } from "@/lib/nav-cache-warmer";
import {
  initializeApp,
  readBootPayloadFromCache,
  type BootstrapPayload,
} from "@/lib/app-init";
import { getCacheOwner, hydratePersistentCaches } from "@/lib/client-cache";
import {
  HOME_DATA_EVENT,
  NUTRITION_DASHBOARD_EVENT,
} from "@/lib/nutrition-sync";
import { nutritionDashboardToHomeMacros } from "@/lib/nutrition-to-home";
import { isValidDashboardPayload } from "@/lib/nutrition-defaults";
import { FirstSetupOverlay } from "@/components/layout/first-setup-overlay";

/** After first paint — never blocks Home (no artificial delay). */
function schedulePostBootWarm() {
  if (typeof window === "undefined") return;
  // Food history ASAP so Nutrition "+" is instant (single warm path)
  void import("@/lib/food-history-cache").then((m) => m.warmFoodHistoryCache());
  const run = () => {
    warmNavDataCaches();
    // Active session warm is owned by warmNavDataCaches — avoid double fetch
  };
  const ric = window.requestIdleCallback;
  if (typeof ric === "function") {
    ric(run, { timeout: 1200 });
  } else {
    requestAnimationFrame(run);
  }
}

function hydrateBootFromDisk(): BootstrapPayload | null {
  if (typeof window === "undefined") return null;
  const owner = getCacheOwner();
  if (owner) hydratePersistentCaches(owner);
  return readBootPayloadFromCache();
}

export function AppClientShell({ children }: { children: ReactNode }) {
  const { data: session, status } = useSession();
  const userId = session?.user?.id ?? null;
  const initFor = useRef<string | null>(null);

  const [bootPayload, setBootPayload] = useState<BootstrapPayload | null>(() =>
    hydrateBootFromDisk()
  );

  // Keep cache warm while session resolves (no UI block)
  useEffect(() => {
    if (status !== "loading") return;
    const cached = hydrateBootFromDisk();
    if (cached) setBootPayload(cached);
  }, [status]);

  useEffect(() => {
    if (status === "loading") return;

    if (status === "unauthenticated") {
      initFor.current = null;
      return;
    }

    if (!userId) return;
    if (initFor.current === userId) return;
    initFor.current = userId;

    let cancelled = false;

    // Show cached Home immediately if available
    const cached = hydrateBootFromDisk();
    if (cached && !cancelled) setBootPayload(cached);

    void initializeApp(userId).then((result) => {
      if (cancelled) return;
      if (result.payload) setBootPayload(result.payload);
      schedulePostBootWarm();
    });

    return () => {
      cancelled = true;
    };
  }, [userId, status]);

  useEffect(() => {
    const onNutrition = (e: Event) => {
      const nutrition = (e as CustomEvent<NutritionDashboardPayload>).detail;
      if (!nutrition || !isValidDashboardPayload(nutrition)) return;
      setBootPayload((prev) => {
        if (!prev) return prev;
        if (
          prev.nutrition?.targets?.calories === nutrition.targets.calories &&
          prev.nutrition?.remaining?.calories === nutrition.remaining.calories &&
          prev.nutrition?.consumed?.calories === nutrition.consumed.calories
        ) {
          return prev;
        }
        return {
          ...prev,
          nutrition,
          home: {
            ...prev.home,
            ...nutritionDashboardToHomeMacros(nutrition),
            nutrition,
          },
        };
      });
    };
    const onHome = (e: Event) => {
      const home = (e as CustomEvent<HomeDataPayload>).detail;
      if (!home) return;
      setBootPayload((prev) => (prev ? { ...prev, home } : prev));
    };
    window.addEventListener(NUTRITION_DASHBOARD_EVENT, onNutrition);
    window.addEventListener(HOME_DATA_EVENT, onHome);
    return () => {
      window.removeEventListener(NUTRITION_DASHBOARD_EVENT, onNutrition);
      window.removeEventListener(HOME_DATA_EVENT, onHome);
    };
  }, []);

  const initialHome: HomeDataPayload | null = bootPayload?.home ?? null;
  const initialNutrition: NutritionDashboardPayload | null =
    bootPayload?.nutrition ?? null;
  const initialProfile: ProfileServerPrefetch | null = bootPayload?.profile ?? null;

  return (
    <ProfileDataProvider initialProfile={initialProfile}>
      <NutritionDataProvider initialDashboard={initialNutrition}>
        <HomeDataProvider initialHome={initialHome}>
          <FirstSetupOverlay nutrition={initialNutrition} />
          <AppShell>{children}</AppShell>
        </HomeDataProvider>
      </NutritionDataProvider>
    </ProfileDataProvider>
  );
}
