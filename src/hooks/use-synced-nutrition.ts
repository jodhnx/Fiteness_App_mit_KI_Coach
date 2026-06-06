"use client";

import { useCallback, useEffect, useState } from "react";
import {
  NUTRITION_DASHBOARD_CACHE_KEY,
  NUTRITION_DASHBOARD_EVENT,
  publishNutritionDashboard,
  ensureNutritionCacheIsToday,
} from "@/lib/nutrition-sync";
import {
  createEmptyNutritionDashboard,
  isValidDashboardPayload,
  type NutritionDashboardPayload,
} from "@/lib/nutrition-defaults";
import { getCached } from "@/lib/client-cache";
import { usePrefetchedNutrition } from "@/components/providers/nutrition-data-provider";
import { nutritionDayKey, isNutritionDashboardToday } from "@/lib/nutrition-day";

function resolveDashboard(
  initial?: NutritionDashboardPayload | null
): NutritionDashboardPayload {
  ensureNutritionCacheIsToday();
  const cached = getCached<NutritionDashboardPayload>(NUTRITION_DASHBOARD_CACHE_KEY);
  if (cached && isValidDashboardPayload(cached) && isNutritionDashboardToday(cached.date)) {
    return cached;
  }
  if (initial && isValidDashboardPayload(initial) && isNutritionDashboardToday(initial.date)) {
    publishNutritionDashboard(initial);
    return initial;
  }
  return { ...createEmptyNutritionDashboard(), date: nutritionDayKey() };
}

/**
 * Nutrition state synced via client cache + custom events.
 * Never overwrites fresher cache with stale server bundles.
 */
export function useSyncedNutrition(initial?: NutritionDashboardPayload | null) {
  const prefetched = usePrefetchedNutrition();
  const [dashboard, setDashboard] = useState<NutritionDashboardPayload>(() => {
    if (prefetched && isValidDashboardPayload(prefetched) && isNutritionDashboardToday(prefetched.date)) {
      publishNutritionDashboard(prefetched);
      return prefetched;
    }
    return resolveDashboard(initial);
  });

  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent<NutritionDashboardPayload>).detail;
      if (detail && isValidDashboardPayload(detail) && isNutritionDashboardToday(detail.date)) {
        setDashboard(detail);
      }
    };
    window.addEventListener(NUTRITION_DASHBOARD_EVENT, handler);
    return () => window.removeEventListener(NUTRITION_DASHBOARD_EVENT, handler);
  }, []);

  useEffect(() => {
    const tick = () => {
      const today = nutritionDayKey();
      if (dashboard.date !== today) {
        ensureNutritionCacheIsToday();
        setDashboard({ ...createEmptyNutritionDashboard(), date: today });
      }
    };
    const id = window.setInterval(tick, 60_000);
    return () => window.clearInterval(id);
  }, [dashboard.date]);

  const applyDashboard = useCallback((next: NutritionDashboardPayload) => {
    publishNutritionDashboard(next);
    setDashboard(next);
  }, []);

  return { dashboard, applyDashboard };
}
