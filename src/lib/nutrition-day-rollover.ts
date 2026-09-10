import { nutritionDayKey } from "@/lib/nutrition-day";
import {
  createEmptyNutritionDashboard,
  isValidDashboardPayload,
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

/**
 * Canonical merge for Home / Ernährung / any device:
 * Server dashboard wins over disk when it has a calorie target.
 * If the server date is not the user's local calendar day, keep targets but
 * reset intake — never paint the previous UTC day's meals as today.
 */
export function preferCanonicalNutritionDashboard(
  server: NutritionDashboardPayload | null | undefined,
  disk: NutritionDashboardPayload | null | undefined,
  today = new Date()
): NutritionDashboardPayload {
  const todayKey = nutritionDayKey(today);

  if (server && isValidDashboardPayload(server) && server.targets.calories > 0) {
    const normalized = normalizeNutritionDashboard(server);
    if (normalized.date === todayKey) return normalized;
    return rolloverNutritionDashboardToToday(normalized, today);
  }

  const fromDisk =
    disk && isValidDashboardPayload(disk)
      ? resolveNutritionDashboardForBoot(disk, today)
      : null;
  if (fromDisk) return normalizeNutritionDashboard(fromDisk);

  if (server && isValidDashboardPayload(server)) {
    const normalized = normalizeNutritionDashboard(server);
    if (normalized.date === todayKey) return normalized;
    return rolloverNutritionDashboardToToday(normalized, today);
  }

  return normalizeNutritionDashboard({
    ...createEmptyNutritionDashboard(today),
    date: todayKey,
  });
}
