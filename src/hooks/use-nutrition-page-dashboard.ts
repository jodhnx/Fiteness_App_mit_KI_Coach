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
import { nutritionDayQueryString } from "@/lib/nutrition-day";

function isPaintReadyDashboard(data: unknown): data is NutritionDashboardPayload {
  if (!data || typeof data !== "object") return false;
  const d = data as NutritionDashboardPayload;
  return (
    Array.isArray(d.mealsByType) &&
    d.mealsByType.length > 0 &&
    typeof d.targets?.calories === "number" &&
    typeof d.consumed?.calories === "number"
  );
}

/**
 * Ernährung page — reads from central nutrition store; API only for background refresh.
 */
export function useNutritionPageDashboard(ttlMs = 120_000) {
  const { dashboard, applyDashboard } = useCentralNutrition();
  const usable = isPaintReadyDashboard(dashboard);
  const cacheHit =
    getCached(NUTRITION_DASHBOARD_CACHE_KEY, { allowStale: true }) != null;
  const paintReady = usable || cacheHit;

  const {
    data: fetched,
    loading,
    error,
    timedOut,
    reload: refetch,
  } = useCachedFetch(
    NUTRITION_DASHBOARD_CACHE_KEY,
    `/api/nutrition/dashboard?${nutritionDayQueryString()}`,
    ttlMs,
    8_000,
    {
      revalidateOnMount: true,
      staleRatio: paintReady ? 0 : 0.5,
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

  return {
    dashboard,
    loading: loading && !paintReady,
    error: paintReady ? null : error,
    timedOut: paintReady ? false : timedOut,
    reload,
    applyDashboard,
  };
}

/** @deprecated use useNutritionPageDashboard — kept for any residual imports */
export const useNutritionDashboard = useNutritionPageDashboard;
