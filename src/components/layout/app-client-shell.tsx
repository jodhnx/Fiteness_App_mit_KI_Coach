"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { useSession } from "next-auth/react";
import { NutritionDataProvider } from "@/components/providers/nutrition-data-provider";
import { ProfileDataProvider } from "@/components/providers/profile-data-provider";
import { HomeDataProvider } from "@/components/providers/home-data-provider";
import { AppShell } from "@/components/layout/app-shell";
import type { NutritionDashboardPayload } from "@/lib/nutrition-defaults";
import type { ProfileServerPrefetch } from "@/lib/profile-prefetch";
import { publishNutritionDashboard } from "@/lib/nutrition-sync";
import { setCached } from "@/lib/client-cache";
import { PROFILE_CACHE_KEY } from "@/lib/nutrition-sync";
import { isValidDashboardPayload, normalizeNutritionDashboard } from "@/lib/nutrition-defaults";
import { isNutritionDashboardToday } from "@/lib/nutrition-day";

/**
 * Stable app shell — loads account data once after auth, never remounts
 * providers on menu switches. No outer shell error boundary that would
 * replace the entire UI (page boundary lives inside AppShell).
 */
export function AppClientShell({ children }: { children: ReactNode }) {
  const { data: session, status } = useSession();
  const userId = session?.user?.id ?? null;
  const loadedFor = useRef<string | null>(null);

  useEffect(() => {
    if (status === "loading" || !userId) return;
    if (loadedFor.current === userId) return;
    loadedFor.current = userId;

    let cancelled = false;

    void (async () => {
      try {
        const [dashRes, profileRes] = await Promise.all([
          fetch("/api/nutrition/dashboard", { credentials: "same-origin" }),
          fetch("/api/profile", { credentials: "same-origin" }),
        ]);

        if (cancelled) return;

        if (dashRes.ok) {
          const dash = (await dashRes.json()) as NutritionDashboardPayload;
          if (
            isValidDashboardPayload(dash) &&
            isNutritionDashboardToday(dash.date)
          ) {
            publishNutritionDashboard(normalizeNutritionDashboard(dash));
          }
        }

        if (profileRes.ok) {
          const profile = (await profileRes.json()) as ProfileServerPrefetch;
          if (profile?.user || profile?.profile) {
            setCached(PROFILE_CACHE_KEY, profile, 120_000);
          }
        }
      } catch (e) {
        console.error("[AppClientShell] initial data load failed", e);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [userId, status]);

  useEffect(() => {
    if (status === "unauthenticated") {
      loadedFor.current = null;
    }
  }, [status]);

  return (
    <ProfileDataProvider initialProfile={null}>
      <NutritionDataProvider initialDashboard={null}>
        <HomeDataProvider initialHome={null}>
          <AppShell>{children}</AppShell>
        </HomeDataProvider>
      </NutritionDataProvider>
    </ProfileDataProvider>
  );
}
