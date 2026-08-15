"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import {
  isValidDashboardPayload,
  type NutritionDashboardPayload,
} from "@/lib/nutrition-defaults";
import {
  NUTRITION_DASHBOARD_CACHE_KEY,
  NUTRITION_DASHBOARD_EVENT,
  publishNutritionDashboard,
  ensureNutritionCacheIsToday,
} from "@/lib/nutrition-sync";
import { isNutritionDashboardToday } from "@/lib/nutrition-day";
import { getCached } from "@/lib/client-cache";
import { createEmptyNutritionDashboard } from "@/lib/nutrition-defaults";
import { nutritionDayKey } from "@/lib/nutrition-day";

export type NutritionContextValue = {
  dashboard: NutritionDashboardPayload;
  applyDashboard: (next: NutritionDashboardPayload) => void;
};

export const NutritionDataContext = createContext<NutritionContextValue | null>(
  null
);

function resolveInitialDashboard(
  initialDashboard: NutritionDashboardPayload | null
): NutritionDashboardPayload {
  ensureNutritionCacheIsToday();
  const cached = getCached<NutritionDashboardPayload>(
    NUTRITION_DASHBOARD_CACHE_KEY
  );
  const cacheValid =
    cached &&
    isValidDashboardPayload(cached) &&
    isNutritionDashboardToday(cached.date);
  const serverValid =
    initialDashboard &&
    isValidDashboardPayload(initialDashboard) &&
    isNutritionDashboardToday(initialDashboard.date);

  if (serverValid) return initialDashboard;
  if (cacheValid) return cached;
  return { ...createEmptyNutritionDashboard(), date: nutritionDayKey() };
}

export function NutritionDataProvider({
  initialDashboard,
  children,
}: {
  initialDashboard: NutritionDashboardPayload | null;
  children: ReactNode;
}) {
  const [dashboard, setDashboard] = useState<NutritionDashboardPayload>(() =>
    resolveInitialDashboard(initialDashboard)
  );

  useEffect(() => {
    if (!initialDashboard) return;
    const resolved = resolveInitialDashboard(initialDashboard);
    const cached = getCached<NutritionDashboardPayload>(NUTRITION_DASHBOARD_CACHE_KEY);
    const cacheValid =
      cached &&
      isValidDashboardPayload(cached) &&
      isNutritionDashboardToday(cached.date);

    if (
      cacheValid &&
      cached.consumed.calories === resolved.consumed.calories &&
      cached.targets.calories === resolved.targets.calories
    ) {
      return;
    }

    publishNutritionDashboard(resolved);
    setDashboard(resolved);
  }, [initialDashboard]);

  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent<NutritionDashboardPayload>).detail;
      if (
        detail &&
        isValidDashboardPayload(detail) &&
        isNutritionDashboardToday(detail.date)
      ) {
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

  return (
    <NutritionDataContext.Provider value={{ dashboard, applyDashboard }}>
      {children}
    </NutritionDataContext.Provider>
  );
}

/** @deprecated Use useCentralNutrition() */
export function usePrefetchedNutrition(): NutritionDashboardPayload | null {
  const ctx = useContext(NutritionDataContext);
  return ctx?.dashboard ?? null;
}
