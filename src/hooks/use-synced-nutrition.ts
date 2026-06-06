"use client";

import { useCallback, useEffect, useState } from "react";
import {
  NUTRITION_DASHBOARD_CACHE_KEY,
  NUTRITION_DASHBOARD_EVENT,
  publishNutritionDashboard,
} from "@/lib/nutrition-sync";
import {
  createEmptyNutritionDashboard,
  isValidDashboardPayload,
  type NutritionDashboardPayload,
} from "@/lib/nutrition-defaults";
import { getCached } from "@/lib/client-cache";
import { usePrefetchedNutrition } from "@/components/providers/nutrition-data-provider";

/**
 * Nutrition state synced via client cache + custom events (no extra fetch when home bundles nutrition).
 */
export function useSyncedNutrition(initial?: NutritionDashboardPayload | null) {
  const prefetched = usePrefetchedNutrition();
  const [dashboard, setDashboard] = useState<NutritionDashboardPayload>(() => {
    const cached = getCached<NutritionDashboardPayload>(NUTRITION_DASHBOARD_CACHE_KEY);
    if (cached && isValidDashboardPayload(cached)) return cached;
    if (prefetched && isValidDashboardPayload(prefetched)) {
      publishNutritionDashboard(prefetched);
      return prefetched;
    }
    if (initial && isValidDashboardPayload(initial)) {
      publishNutritionDashboard(initial);
      return initial;
    }
    return createEmptyNutritionDashboard();
  });

  useEffect(() => {
    if (initial && isValidDashboardPayload(initial)) {
      const cached = getCached<NutritionDashboardPayload>(NUTRITION_DASHBOARD_CACHE_KEY);
      if (!cached || cached.date !== initial.date) {
        publishNutritionDashboard(initial);
      }
      setDashboard(initial);
    }
  }, [initial]);

  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent<NutritionDashboardPayload>).detail;
      if (detail && isValidDashboardPayload(detail)) {
        setDashboard(detail);
      }
    };
    window.addEventListener(NUTRITION_DASHBOARD_EVENT, handler);
    return () => window.removeEventListener(NUTRITION_DASHBOARD_EVENT, handler);
  }, []);

  const applyDashboard = useCallback((next: NutritionDashboardPayload) => {
    publishNutritionDashboard(next);
    setDashboard(next);
  }, []);

  return { dashboard, applyDashboard };
}
