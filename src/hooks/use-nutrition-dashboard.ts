"use client";

import { useCallback, useEffect, useState } from "react";
import { useCachedFetch } from "@/hooks/use-cached-fetch";
import {
  NUTRITION_DASHBOARD_CACHE_KEY,
  NUTRITION_DASHBOARD_EVENT,
  publishNutritionDashboard,
  invalidateAllNutritionCaches,
} from "@/lib/nutrition-sync";
import {
  createEmptyNutritionDashboard,
  isValidDashboardPayload,
  type NutritionDashboardPayload,
} from "@/lib/nutrition-defaults";

const DASHBOARD_URL = "/api/nutrition/dashboard";

/**
 * Shared nutrition day state — used by Ernährung + Home (macros).
 * Updates instantly via publishNutritionDashboard() after add/delete.
 */
export function useNutritionDashboard(ttlMs = 60_000) {
  const {
    data: fetched,
    loading,
    error,
    timedOut,
    reload: refetch,
  } = useCachedFetch<NutritionDashboardPayload>(
    NUTRITION_DASHBOARD_CACHE_KEY,
    DASHBOARD_URL,
    ttlMs,
    8_000,
    { revalidateOnMount: false, staleRatio: 0.95 }
  );

  const [live, setLive] = useState<NutritionDashboardPayload | null>(null);

  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent<NutritionDashboardPayload>).detail;
      if (detail && isValidDashboardPayload(detail)) {
        setLive(detail);
      }
    };
    window.addEventListener(NUTRITION_DASHBOARD_EVENT, handler);
    return () => window.removeEventListener(NUTRITION_DASHBOARD_EVENT, handler);
  }, []);

  useEffect(() => {
    if (fetched && isValidDashboardPayload(fetched)) {
      setLive(null);
    }
  }, [fetched]);

  const dashboard: NutritionDashboardPayload =
    live ??
    (fetched && isValidDashboardPayload(fetched) ? fetched : createEmptyNutritionDashboard());

  const reload = useCallback(() => {
    invalidateAllNutritionCaches();
    setLive(null);
    refetch();
  }, [refetch]);

  const applyDashboard = useCallback((next: NutritionDashboardPayload) => {
    publishNutritionDashboard(next);
    setLive(next);
  }, []);

  return {
    dashboard,
    loading,
    error,
    timedOut,
    reload,
    applyDashboard,
  };
}
