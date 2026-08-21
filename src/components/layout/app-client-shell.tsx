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
import { runBootSecondaryPrefetch } from "@/lib/boot-prefetch";
import {
  initializeApp,
  readBootPayloadFromCache,
  type BootstrapPayload,
} from "@/lib/app-init";
import { getCacheOwner, hydratePersistentCaches } from "@/lib/client-cache";

/** After first paint — never blocks Home. */
function schedulePostBootWarm() {
  if (typeof window === "undefined") return;
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      window.setTimeout(() => {
        warmNavDataCaches();
        runBootSecondaryPrefetch();
      }, 800);
    });
  });
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

  const initialHome: HomeDataPayload | null = bootPayload?.home ?? null;
  const initialNutrition: NutritionDashboardPayload | null =
    bootPayload?.nutrition ?? null;
  const initialProfile: ProfileServerPrefetch | null = bootPayload?.profile ?? null;

  return (
    <ProfileDataProvider initialProfile={initialProfile}>
      <NutritionDataProvider initialDashboard={initialNutrition}>
        <HomeDataProvider initialHome={initialHome}>
          <AppShell>{children}</AppShell>
        </HomeDataProvider>
      </NutritionDataProvider>
    </ProfileDataProvider>
  );
}
