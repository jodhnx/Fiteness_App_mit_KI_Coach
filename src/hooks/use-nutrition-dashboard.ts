"use client";

import { useCallback, useEffect } from "react";
import { useCachedFetch } from "@/hooks/use-cached-fetch";
import { useCentralNutrition } from "@/hooks/use-central-nutrition";
import {
  NUTRITION_DASHBOARD_CACHE_KEY,
  invalidateAllNutritionCaches,
} from "@/lib/nutrition-sync";
import { getCached } from "@/lib/client-cache";
import {
  hasUsableNutritionDashboard,
  isValidDashboardPayload,
} from "@/lib/nutrition-defaults";

import { nutritionDayQueryString } from "@/lib/nutrition-day";

/**
 * Ernährung page — reads from central nutrition store; API only for background refresh.
 *
 * When meal slots / water / targets are already paintably present (cache, bootstrap,
 * or empty shell), a slow dashboard refresh must NEVER surface as
 * "Laden dauert zu lange". Optional food history / AI / recipes are separate.
 */
export function useNutritionDashboard(ttlMs = 120_000) {
  const { dashboard, applyDashboard } = useCentralNutrition();
  const usable = hasUsableNutritionDashboard(dashboard);
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
      // Soft-revalidate when UI already has meal slots / cache — never block.
      staleRatio: paintReady ? 0 : 0.5,
    }
  );

  useEffect(() => {
    if (fetched && isValidDashboardPayload(fetched)) {
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
