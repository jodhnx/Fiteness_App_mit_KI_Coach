"use client";

import { useEffect, useState } from "react";
import {
  HOME_DATA_CACHE_KEY,
  HOME_DATA_EVENT,
  NUTRITION_DASHBOARD_EVENT,
  NUTRITION_DASHBOARD_CACHE_KEY,
  ensureNutritionCacheIsToday,
} from "@/lib/nutrition-sync";
import {
  createEmptyHomeData,
  normalizeHomeData,
  type HomeDataPayload,
} from "@/lib/home-defaults";
import { getCached } from "@/lib/client-cache";
import { nutritionDashboardToHomeMacros } from "@/lib/nutrition-to-home";
import { buildHomeCoachFromNutrition } from "@/lib/nutrition-coach";
import type { NutritionDashboardPayload } from "@/lib/nutrition-defaults";
import { isValidDashboardPayload } from "@/lib/nutrition-defaults";
import { isNutritionDashboardToday } from "@/lib/nutrition-day";

function mergeHomeWithNutrition(
  home: HomeDataPayload,
  nutrition: NutritionDashboardPayload
): HomeDataPayload {
  return normalizeHomeData({
    ...home,
    ...nutritionDashboardToHomeMacros(nutrition),
    nutrition,
    coach: buildHomeCoachFromNutrition(nutrition),
  });
}

function resolveInitialHome(fetched: HomeDataPayload | null): HomeDataPayload {
  ensureNutritionCacheIsToday();
  const nutrition = getCached<NutritionDashboardPayload>(NUTRITION_DASHBOARD_CACHE_KEY);
  const cached = getCached<HomeDataPayload>(HOME_DATA_CACHE_KEY);

  if (
    nutrition &&
    isValidDashboardPayload(nutrition) &&
    isNutritionDashboardToday(nutrition.date)
  ) {
    const base = normalizeHomeData(cached ?? fetched ?? createEmptyHomeData());
    return mergeHomeWithNutrition(base, nutrition);
  }
  if (cached) return normalizeHomeData(cached);
  return normalizeHomeData(fetched ?? createEmptyHomeData());
}

/**
 * Home payload synced with central nutrition store (single kcal source).
 */
export function useHomeLiveData(fetched: HomeDataPayload | null) {
  const [home, setHome] = useState<HomeDataPayload>(() => resolveInitialHome(fetched));

  useEffect(() => {
    if (!fetched) return;
    const nutrition = getCached<NutritionDashboardPayload>(NUTRITION_DASHBOARD_CACHE_KEY);
    let next: HomeDataPayload;
    if (
      nutrition &&
      isValidDashboardPayload(nutrition) &&
      isNutritionDashboardToday(nutrition.date)
    ) {
      next = mergeHomeWithNutrition(normalizeHomeData(fetched), nutrition);
    } else {
      const cached = getCached<HomeDataPayload>(HOME_DATA_CACHE_KEY);
      next = cached ? normalizeHomeData(cached) : normalizeHomeData(fetched);
    }
    setHome((prev) => {
      if (JSON.stringify(prev) === JSON.stringify(next)) return prev;
      return next;
    });
  }, [fetched]);

  useEffect(() => {
    const onHome = (e: Event) => {
      const detail = (e as CustomEvent<HomeDataPayload>).detail;
      if (detail) setHome(normalizeHomeData(detail));
    };
    const onNutrition = (e: Event) => {
      const nutrition = (e as CustomEvent<NutritionDashboardPayload>).detail;
      if (!nutrition || !isValidDashboardPayload(nutrition)) return;
      setHome((prev) => mergeHomeWithNutrition(prev, nutrition));
    };
    window.addEventListener(HOME_DATA_EVENT, onHome);
    window.addEventListener(NUTRITION_DASHBOARD_EVENT, onNutrition);
    return () => {
      window.removeEventListener(HOME_DATA_EVENT, onHome);
      window.removeEventListener(NUTRITION_DASHBOARD_EVENT, onNutrition);
    };
  }, []);

  return home;
}
