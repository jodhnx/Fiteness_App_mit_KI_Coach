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
import { getCached } from "@/lib/client-cache";
import { preferCanonicalNutritionDashboard } from "@/lib/nutrition-day-rollover";

export type NutritionContextValue = {
  dashboard: NutritionDashboardPayload;
  applyDashboard: (next: NutritionDashboardPayload) => void;
};

export const NutritionDataContext = createContext<NutritionContextValue | null>(
  null
);

function nutritionSnapshotsMatch(
  a: NutritionDashboardPayload,
  b: NutritionDashboardPayload
): boolean {
  return (
    a.date === b.date &&
    a.consumed.calories === b.consumed.calories &&
    a.remaining.calories === b.remaining.calories &&
    a.targets.calories === b.targets.calories &&
    (a.mealsByType?.length ?? 0) === (b.mealsByType?.length ?? 0)
  );
}

function readDiskDashboard(): NutritionDashboardPayload | null {
  const rolledFromDisk = ensureNutritionCacheIsToday();
  if (rolledFromDisk) return rolledFromDisk;
  const cached = getCached<NutritionDashboardPayload>(NUTRITION_DASHBOARD_CACHE_KEY, {
    allowStale: true,
  });
  return cached && isValidDashboardPayload(cached) ? cached : null;
}

function resolveInitialDashboard(
  initialDashboard: NutritionDashboardPayload | null
): NutritionDashboardPayload {
  return preferCanonicalNutritionDashboard(initialDashboard, readDiskDashboard());
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
    if (!initialDashboard || !isValidDashboardPayload(initialDashboard)) return;
    // Server/bootstrap payload wins. Do not re-prefer disk here — that was
    // overwriting a fresh calorieTarget with a stale mobile/desktop cache.
    const resolved = preferCanonicalNutritionDashboard(initialDashboard, null);
    setDashboard((prev) => {
      if (
        prev.date === resolved.date &&
        prev.consumed.calories === resolved.consumed.calories &&
        prev.remaining.calories === resolved.remaining.calories &&
        prev.targets.calories === resolved.targets.calories
      ) {
        return prev;
      }
      return resolved;
    });
    const cached = getCached<NutritionDashboardPayload>(NUTRITION_DASHBOARD_CACHE_KEY, {
      allowStale: true,
    });
    if (!cached || !nutritionSnapshotsMatch(cached, resolved)) {
      publishNutritionDashboard(resolved);
    }
  }, [initialDashboard]);

  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent<NutritionDashboardPayload>).detail;
      if (detail && isValidDashboardPayload(detail)) {
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
