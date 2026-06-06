"use client";

import { useCallback, useEffect } from "react";
import { useCachedFetch } from "@/hooks/use-cached-fetch";
import { useCentralNutrition } from "@/hooks/use-central-nutrition";
import {
  NUTRITION_DASHBOARD_CACHE_KEY,
  invalidateAllNutritionCaches,
} from "@/lib/nutrition-sync";
import { getCached } from "@/lib/client-cache";
import { isValidDashboardPayload } from "@/lib/nutrition-defaults";

const DASHBOARD_URL = "/api/nutrition/dashboard";

/**
 * Ernährung page — reads from central nutrition store; API only for background refresh.
 */
export function useNutritionDashboard(ttlMs = 120_000) {
  const { dashboard, applyDashboard } = useCentralNutrition();

  const {
    data: fetched,
    loading,
    error,
    timedOut,
    reload: refetch,
  } = useCachedFetch(
    NUTRITION_DASHBOARD_CACHE_KEY,
    DASHBOARD_URL,
    ttlMs,
    8_000,
    { revalidateOnMount: false, staleRatio: 0.98 }
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
    loading: loading && !getCached(NUTRITION_DASHBOARD_CACHE_KEY),
    error,
    timedOut,
    reload,
    applyDashboard,
  };
}
