"use client";

import { useEffect, useState } from "react";
import {
  HOME_DATA_CACHE_KEY,
  HOME_DATA_EVENT,
  NUTRITION_DASHBOARD_EVENT,
  ensureNutritionCacheIsToday,
} from "@/lib/nutrition-sync";
import {
  createEmptyHomeData,
  normalizeHomeData,
  type HomeDataPayload,
} from "@/lib/home-defaults";
import { getCached } from "@/lib/client-cache";
import { nutritionDashboardToHomeMacros } from "@/lib/nutrition-to-home";
import type { NutritionDashboardPayload } from "@/lib/nutrition-defaults";
import { isValidDashboardPayload } from "@/lib/nutrition-defaults";

function mergeHomeWithNutrition(
  home: HomeDataPayload,
  nutrition: NutritionDashboardPayload
): HomeDataPayload {
  return normalizeHomeData({
    ...home,
    ...nutritionDashboardToHomeMacros(nutrition),
    nutrition,
  });
}

/**
 * Home payload that stays in sync with nutrition mutations (no stale /api/home wait).
 */
export function useHomeLiveData(fetched: HomeDataPayload | null) {
  const [home, setHome] = useState<HomeDataPayload>(() => {
    ensureNutritionCacheIsToday();
    const cached = getCached<HomeDataPayload>(HOME_DATA_CACHE_KEY);
    if (cached) return normalizeHomeData(cached);
    return normalizeHomeData(fetched ?? createEmptyHomeData());
  });

  useEffect(() => {
    if (!fetched) return;
    const cached = getCached<HomeDataPayload>(HOME_DATA_CACHE_KEY);
    if (!cached) {
      setHome(normalizeHomeData(fetched));
    }
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
