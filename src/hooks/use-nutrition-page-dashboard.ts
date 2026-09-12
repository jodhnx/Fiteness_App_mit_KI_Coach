"use client";

import { useCallback, useEffect } from "react";
import { useCachedFetch } from "@/hooks/use-cached-fetch";
import { useCentralNutrition } from "@/hooks/use-central-nutrition";
import {
  NUTRITION_DASHBOARD_CACHE_KEY,
  invalidateAllNutritionCaches,
} from "@/lib/nutrition-sync";
import { getCached } from "@/lib/client-cache";
import type { NutritionDashboardPayload } from "@/lib/nutrition-defaults";
import { hasNutritionTargets } from "@/lib/nutrition-defaults";
import { nutritionDayQueryString } from "@/lib/nutrition-day";
import { sanitizeCalorieTarget } from "@/lib/daily-kcal";
import { isBootSettled } from "@/lib/app-init";

function isPaintReadyDashboard(data: unknown): data is NutritionDashboardPayload {
  if (!data || typeof data !== "object") return false;
  const d = data as NutritionDashboardPayload;
  const target = sanitizeCalorieTarget(d.targets?.calories) ?? 0;
  return (
    Array.isArray(d.mealsByType) &&
    d.mealsByType.length > 0 &&
    target > 0 &&
    typeof d.consumed?.calories === "number"
  );
}

/**
 * Ernährung page — reads from central nutrition store; API only for background refresh.
 */
export function useNutritionPageDashboard(ttlMs = 120_000) {
  const { dashboard, applyDashboard } = useCentralNutrition();
  const cached = getCached<NutritionDashboardPayload>(
    NUTRITION_DASHBOARD_CACHE_KEY,
    { allowStale: true }
  );
  const usable = isPaintReadyDashboard(dashboard);
  const cachedReady = isPaintReadyDashboard(cached);
  // Prefer central store; fall back to cache so boot hydrate never flashes missing_target.
  const displayDashboard: NutritionDashboardPayload = usable
    ? dashboard
    : cachedReady
      ? cached!
      : dashboard;
  const paintReady = usable || cachedReady;

  const {
    data: fetched,
    loading,
    error,
    timedOut,
    reload: refetch,
  } = useCachedFetch<NutritionDashboardPayload>(
    NUTRITION_DASHBOARD_CACHE_KEY,
    `/api/nutrition/dashboard?${nutritionDayQueryString()}`,
    ttlMs,
    8_000,
    {
      revalidateOnMount: false,
      staleRatio: paintReady ? 0.85 : 0.5,
    }
  );

  useEffect(() => {
    if (fetched && isPaintReadyDashboard(fetched)) {
      applyDashboard(fetched);
    }
  }, [fetched, applyDashboard]);

  const reload = useCallback(() => {
    invalidateAllNutritionCaches();
    refetch();
  }, [refetch]);

  const settledWithoutTarget =
    !loading &&
    !paintReady &&
    isBootSettled() &&
    fetched != null &&
    !hasNutritionTargets(fetched);

  return {
    dashboard: displayDashboard,
    // Keep skeleton while boot/cache catch up — never flash "Kalorienziel festlegen".
    loading:
      (loading && !paintReady) ||
      (!paintReady && !settledWithoutTarget && !error && !timedOut) ||
      (!paintReady && !isBootSettled()),
    error: paintReady ? null : error,
    timedOut: paintReady ? false : timedOut,
    reload,
    applyDashboard,
  };
}

/** @deprecated use useNutritionPageDashboard — kept for any residual imports */
export const useNutritionDashboard = useNutritionPageDashboard;
