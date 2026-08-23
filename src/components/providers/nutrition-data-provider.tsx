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
  normalizeNutritionDashboard,
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
import { resolveNutritionDashboardForBoot } from "@/lib/nutrition-day-rollover";

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
  const rolledFromDisk = ensureNutritionCacheIsToday();
  if (rolledFromDisk) return normalizeNutritionDashboard(rolledFromDisk);

  const cached = getCached<NutritionDashboardPayload>(NUTRITION_DASHBOARD_CACHE_KEY, {
    allowStale: true,
  });
  const fromCache = resolveNutritionDashboardForBoot(cached);
  if (fromCache) return normalizeNutritionDashboard(fromCache);

  const serverValid =
    initialDashboard &&
    isValidDashboardPayload(initialDashboard) &&
    isNutritionDashboardToday(initialDashboard.date);
  if (serverValid) return normalizeNutritionDashboard(initialDashboard);

  const fromServerRollover = initialDashboard
    ? resolveNutritionDashboardForBoot(initialDashboard)
    : null;
  if (fromServerRollover) return normalizeNutritionDashboard(fromServerRollover);

  return normalizeNutritionDashboard({
    ...createEmptyNutritionDashboard(),
    date: nutritionDayKey(),
  });
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
    const resolved = resolveInitialDashboard(initialDashboard);
    setDashboard(resolved);
    if (isNutritionDashboardToday(resolved.date)) {
      publishNutritionDashboard(resolved);
    }
  }, [initialDashboard]);

  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent<NutritionDashboardPayload>).detail;
      if (
        detail &&
        isValidDashboardPayload(detail) &&
        isNutritionDashboardToday(detail.date)
      ) {
        setDashboard(normalizeNutritionDashboard(detail));
      }
    };
    window.addEventListener(NUTRITION_DASHBOARD_EVENT, handler);
    return () => window.removeEventListener(NUTRITION_DASHBOARD_EVENT, handler);
  }, []);

  const applyDashboard = useCallback((next: NutritionDashboardPayload) => {
    const normalized = normalizeNutritionDashboard(next);
    publishNutritionDashboard(normalized);
    setDashboard(normalized);
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
