"use client";

import { useCallback, useEffect, useMemo } from "react";
import { useCachedFetch } from "@/hooks/use-cached-fetch";
import { useCentralNutrition } from "@/hooks/use-central-nutrition";
import {
  NUTRITION_DASHBOARD_CACHE_KEY,
  invalidateAllNutritionCaches,
} from "@/lib/nutrition-sync";
import { getCached, invalidateCache } from "@/lib/client-cache";
import type { NutritionDashboardPayload } from "@/lib/nutrition-defaults";
import { hasNutritionTargets } from "@/lib/nutrition-defaults";
import { nutritionDayKey, nutritionDayQueryString } from "@/lib/nutrition-day";
import {
  isNutritionToday,
  nutritionDashboardCacheKeyForDay,
  nutritionDayQueryForYmd,
} from "@/lib/nutrition-calendar";
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
 * Ernährung page — today uses central store; historical days use day-scoped cache.
 */
export function useNutritionPageDashboard(
  selectedDayYmd?: string,
  ttlMs = 120_000
) {
  const day = selectedDayYmd ?? nutritionDayKey();
  const viewingToday = isNutritionToday(day);
  const cacheKey = nutritionDashboardCacheKeyForDay(day);
  const url = viewingToday
    ? `/api/nutrition/dashboard?${nutritionDayQueryString()}`
    : `/api/nutrition/dashboard?${nutritionDayQueryForYmd(day)}`;

  const { dashboard, applyDashboard } = useCentralNutrition();

  const dayCached = getCached<NutritionDashboardPayload>(cacheKey, {
    allowStale: true,
  });
  const todayCached = viewingToday
    ? getCached<NutritionDashboardPayload>(NUTRITION_DASHBOARD_CACHE_KEY, {
        allowStale: true,
      })
    : null;

  const usableToday = viewingToday && isPaintReadyDashboard(dashboard);
  const cachedReady = isPaintReadyDashboard(dayCached ?? todayCached);

  const displayDashboard: NutritionDashboardPayload = useMemo(() => {
    if (viewingToday) {
      if (usableToday) return dashboard;
      if (cachedReady) return (dayCached ?? todayCached)!;
      return dashboard;
    }
    // Historical: prefer day cache, then fetched — NEVER invent empty 0-kcal day
    // from today's shell (that causes empty-meal flash).
    if (isPaintReadyDashboard(dayCached)) return dayCached!;
    return dayCached ?? dashboard;
  }, [
    viewingToday,
    usableToday,
    dashboard,
    cachedReady,
    dayCached,
    todayCached,
  ]);

  const paintReady =
    (viewingToday && (usableToday || cachedReady)) ||
    (!viewingToday && isPaintReadyDashboard(dayCached));

  const {
    data: fetched,
    loading,
    error,
    timedOut,
    reload: refetch,
  } = useCachedFetch<NutritionDashboardPayload>(
    cacheKey,
    url,
    ttlMs,
    8_000,
    {
      // Historical: revalidate in background when cache exists; fetch when not
      revalidateOnMount: true,
      staleRatio: paintReady ? 0.9 : 0.4,
    }
  );

  useEffect(() => {
    if (!fetched || !isPaintReadyDashboard(fetched)) return;
    if (viewingToday) {
      applyDashboard(fetched);
    }
    // Historical days stay in day-scoped cache via useCachedFetch — do not touch today store.
  }, [fetched, applyDashboard, viewingToday]);

  const reload = useCallback(() => {
    if (viewingToday) {
      invalidateAllNutritionCaches();
    } else {
      invalidateCache(cacheKey);
    }
    refetch();
  }, [viewingToday, cacheKey, refetch]);

  const settledWithoutTarget =
    !loading &&
    !paintReady &&
    isBootSettled() &&
    fetched != null &&
    !hasNutritionTargets(fetched);

  const historicalReady =
    !viewingToday &&
    isPaintReadyDashboard(fetched ?? dayCached);

  // While historical day loads without cache: keep loading=true (skeleton),
  // do not paint a fake empty day.
  const historicalLoading =
    !viewingToday && !historicalReady && (loading || !isBootSettled());

  return {
    dashboard:
      !viewingToday && isPaintReadyDashboard(fetched)
        ? fetched!
        : !viewingToday && isPaintReadyDashboard(dayCached)
          ? dayCached!
          : displayDashboard,
    loading:
      historicalLoading ||
      (loading && !paintReady && !historicalReady) ||
      (viewingToday &&
        !paintReady &&
        !settledWithoutTarget &&
        !error &&
        !timedOut) ||
      (viewingToday && !paintReady && !isBootSettled()),
    error: paintReady || historicalReady ? null : error,
    timedOut: paintReady || historicalReady ? false : timedOut,
    reload,
    applyDashboard,
    selectedDay: day,
    viewingToday,
  };
}

/** @deprecated use useNutritionPageDashboard — kept for any residual imports */
export const useNutritionDashboard = useNutritionPageDashboard;
