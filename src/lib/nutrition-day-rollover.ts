import { nutritionDayKey } from "@/lib/nutrition-day";
import {
  createEmptyNutritionDashboard,
  isValidDashboardPayload,
  normalizeNutritionDashboard,
  type NutritionDashboardPayload,
} from "@/lib/nutrition-defaults";
import type { ProfileServerPrefetch } from "@/lib/profile-prefetch";

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

function profileTargetCalories(
  profile: ProfileServerPrefetch | null | undefined
): number {
  const fromCalc = profile?.calculations?.calorieTarget ?? 0;
  if (fromCalc > 0) return fromCalc;
  const p = profile?.profile as { calorieTarget?: number } | null | undefined;
  return typeof p?.calorieTarget === "number" && p.calorieTarget > 0
    ? p.calorieTarget
    : 0;
}

/** Seed paint-ready nutrition from profile when day cache is empty (overnight). */
export function nutritionShellFromProfile(
  profile: ProfileServerPrefetch | null | undefined,
  today = new Date()
): NutritionDashboardPayload | null {
  const calories = profileTargetCalories(profile);
  if (calories <= 0) return null;
  const calc = profile?.calculations;
  const p = (profile?.profile ?? {}) as Record<string, unknown>;
  const shell = createEmptyNutritionDashboard(today, true);
  return normalizeNutritionDashboard({
    ...shell,
    profileComplete: true,
    empty: false,
    targets: {
      ...shell.targets,
      calories,
      proteinG:
        calc?.proteinTargetG ??
        (typeof p.proteinTargetG === "number" ? p.proteinTargetG : 0),
      carbsG:
        calc?.carbsTargetG ??
        (typeof p.carbsTargetG === "number" ? p.carbsTargetG : 0),
      fatG:
        calc?.fatTargetG ?? (typeof p.fatTargetG === "number" ? p.fatTargetG : 0),
    },
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
