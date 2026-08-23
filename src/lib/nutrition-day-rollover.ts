import { nutritionDayKey } from "@/lib/nutrition-day";
import {
  createEmptyNutritionDashboard,
  normalizeNutritionDashboard,
  type NutritionDashboardPayload,
} from "@/lib/nutrition-defaults";

/**
 * Preserve targets/profile metadata from a prior day but reset today's intake.
 * Used on cold start after midnight so Home never flashes empty targets.
 */
export function rolloverNutritionDashboardToToday(
  prev: NutritionDashboardPayload,
  today = new Date()
): NutritionDashboardPayload {
  const shell = createEmptyNutritionDashboard(today, prev.profileComplete);
  return normalizeNutritionDashboard({
    ...shell,
    date: nutritionDayKey(today),
    targets: { ...prev.targets },
    profileComplete: prev.profileComplete,
    favorites: prev.favorites ?? [],
    recents: prev.recents ?? [],
    empty: false,
  });
}

export function resolveNutritionDashboardForBoot(
  cached: NutritionDashboardPayload | null | undefined,
  today = new Date()
): NutritionDashboardPayload | null {
  if (!cached) return null;
  const normalized = normalizeNutritionDashboard(cached);
  if (normalized.date === nutritionDayKey(today)) return normalized;
  if (normalized.targets.calories > 0 || normalized.profileComplete) {
    return rolloverNutritionDashboardToToday(normalized, today);
  }
  return null;
}
