"use client";

import { useCentralNutrition } from "@/hooks/use-central-nutrition";

/** @deprecated Prefer useCentralNutrition() — thin wrapper for compatibility */
export function useSyncedNutrition(_initial?: unknown) {
  const { dashboard, applyDashboard } = useCentralNutrition();
  return { dashboard, applyDashboard };
}
