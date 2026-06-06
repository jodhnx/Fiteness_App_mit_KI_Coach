"use client";

import { createContext, useContext, useState, type ReactNode } from "react";
import {
  isValidDashboardPayload,
  type NutritionDashboardPayload,
} from "@/lib/nutrition-defaults";
import {
  HOME_DATA_CACHE_KEY,
  NUTRITION_DASHBOARD_CACHE_KEY,
  publishNutritionDashboard,
  ensureNutritionCacheIsToday,
} from "@/lib/nutrition-sync";
import { isNutritionDashboardToday } from "@/lib/nutrition-day";
import { nutritionDashboardToHomeMacros } from "@/lib/nutrition-to-home";
import { getCached, setCached } from "@/lib/client-cache";
import type { HomeDataPayload } from "@/lib/home-defaults";
import { createEmptyHomeData } from "@/lib/home-defaults";

const NutritionDataContext = createContext<NutritionDashboardPayload | null>(
  null
);

function seedCachesFromDashboard(dashboard: NutritionDashboardPayload) {
  publishNutritionDashboard(dashboard);
  const prevHome = getCached<HomeDataPayload>(HOME_DATA_CACHE_KEY);
  setCached(
    HOME_DATA_CACHE_KEY,
    {
      ...(prevHome ?? createEmptyHomeData()),
      ...nutritionDashboardToHomeMacros(dashboard),
      nutrition: dashboard,
    },
    120_000
  );
}

function resolveInitialDashboard(
  initialDashboard: NutritionDashboardPayload | null
): NutritionDashboardPayload | null {
  const cached = getCached<NutritionDashboardPayload>(
    NUTRITION_DASHBOARD_CACHE_KEY
  );
  ensureNutritionCacheIsToday();
  if (cached && isValidDashboardPayload(cached) && isNutritionDashboardToday(cached.date)) {
    return cached;
  }
  if (
    initialDashboard &&
    isValidDashboardPayload(initialDashboard) &&
    isNutritionDashboardToday(initialDashboard.date)
  ) {
    seedCachesFromDashboard(initialDashboard);
    return initialDashboard;
  }
  return null;
}

export function NutritionDataProvider({
  initialDashboard,
  children,
}: {
  initialDashboard: NutritionDashboardPayload | null;
  children: ReactNode;
}) {
  const [dashboard] = useState(() => resolveInitialDashboard(initialDashboard));

  return (
    <NutritionDataContext.Provider value={dashboard}>
      {children}
    </NutritionDataContext.Provider>
  );
}

export function usePrefetchedNutrition(): NutritionDashboardPayload | null {
  return useContext(NutritionDataContext);
}
