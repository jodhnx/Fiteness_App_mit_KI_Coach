"use client";

import { useContext } from "react";
import { NutritionDataContext } from "@/components/providers/nutrition-data-provider";
import {
  createEmptyNutritionDashboard,
  type NutritionDashboardPayload,
} from "@/lib/nutrition-defaults";

/**
 * Single source of truth for kcal / macros across Home, Ernährung & Fortschritt.
 */
export function useCentralNutrition(): {
  dashboard: NutritionDashboardPayload;
  applyDashboard: (next: NutritionDashboardPayload) => void;
} {
  const ctx = useContext(NutritionDataContext);
  if (!ctx) {
    const empty = createEmptyNutritionDashboard();
    return {
      dashboard: empty,
      applyDashboard: () => {},
    };
  }
  return ctx;
}
