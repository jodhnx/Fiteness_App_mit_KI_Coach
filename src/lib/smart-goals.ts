import { differenceInDays, isAfter } from "date-fns";
import type { NutritionGoal, Profile } from "@prisma/client";
import { recalculateProfileTargets, profileToMetricsInput } from "@/lib/profile-calculations";

export type WeightGoalProgress = {
  currentKg: number;
  targetKg: number;
  startKg: number;
  percent: number;
  daysRemaining: number;
  projectedKgPerWeek: number;
  onTrack: boolean;
};

export type WeightGoalProfileInput = {
  weightKg: number | null;
  targetWeightKg: number | null;
  targetWeightDate: Date | null;
};

export function computeWeightGoalProgress(
  profile: WeightGoalProfileInput,
  startWeightKg?: number | null
): WeightGoalProgress | null {
  const current = profile.weightKg;
  const target = profile.targetWeightKg;
  const deadline = profile.targetWeightDate;
  if (current == null || target == null || !deadline) return null;

  const daysRemaining = Math.max(0, differenceInDays(deadline, new Date()));
  const totalChange = target - current;
  const startKg = startWeightKg ?? current;
  const journey = target - startKg;
  let percent = 100;
  if (Math.abs(journey) >= 0.1) {
    percent = Math.min(100, Math.max(0, Math.round(((current - startKg) / journey) * 100)));
  }

  const weeksLeft = Math.max(1, daysRemaining / 7);
  const projectedKgPerWeek = Math.round((totalChange / weeksLeft) * 10) / 10;

  const expectedProgress =
    daysRemaining > 0
      ? 1 - daysRemaining / Math.max(differenceInDays(deadline, subDaysSafe(deadline, 90)), 1)
      : 1;
  const onTrack = percent >= expectedProgress * 80 || Math.abs(totalChange) < 0.5;

  return {
    currentKg: Math.round(current * 10) / 10,
    targetKg: Math.round(target * 10) / 10,
    startKg: Math.round(startKg * 10) / 10,
    percent,
    daysRemaining,
    projectedKgPerWeek,
    onTrack,
  };
}

function subDaysSafe(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() - days);
  return d;
}

/** ~7700 kcal per kg body weight change */
export function adjustCaloriesForWeightGoal(
  baseCalories: number,
  weightKg: number,
  targetWeightKg: number,
  targetDate: Date,
  nutritionGoal: NutritionGoal
): number {
  const days = Math.max(14, differenceInDays(targetDate, new Date()));
  if (days <= 0 || Math.abs(targetWeightKg - weightKg) < 0.2) return baseCalories;

  const kgChange = targetWeightKg - weightKg;
  const dailyKcalAdjust = Math.round((kgChange * 7700) / days);

  let adjusted = baseCalories + dailyKcalAdjust;
  if (nutritionGoal === "FAT_LOSS") adjusted = Math.min(adjusted, baseCalories);
  if (nutritionGoal === "MUSCLE_GAIN" || nutritionGoal === "LEAN_BULK") {
    adjusted = Math.max(adjusted, baseCalories);
  }
  return Math.max(1200, Math.min(5500, adjusted));
}

export function smartGoalCaloriePreview(profile: Profile): {
  calorieTarget: number;
  weightProjection: string;
} | null {
  const metrics = profileToMetricsInput(profile);
  if (!metrics || !profile.targetWeightKg || !profile.targetWeightDate) return null;

  const base = recalculateProfileTargets(metrics);
  const adjusted = adjustCaloriesForWeightGoal(
    base.calorieTarget,
    profile.weightKg!,
    profile.targetWeightKg,
    profile.targetWeightDate,
    metrics.nutritionGoal
  );

  const progress = computeWeightGoalProgress(profile);
  const projection = progress
    ? `~${progress.projectedKgPerWeek > 0 ? "+" : ""}${progress.projectedKgPerWeek} kg/Woche · ${progress.daysRemaining} Tage`
    : "";

  return { calorieTarget: adjusted, weightProjection: projection };
}

export function applySmartGoalsToProfilePatch(
  existing: Profile | null,
  patch: Record<string, unknown>
): Record<string, unknown> {
  const merged = { ...(existing ?? {}), ...patch } as Profile;
  const targetKg = merged.targetWeightKg ?? existing?.targetWeightKg;
  const targetDate = merged.targetWeightDate ?? existing?.targetWeightDate;
  const weightKg = merged.weightKg ?? existing?.weightKg;
  const nutritionGoal = merged.nutritionGoal ?? existing?.nutritionGoal ?? "MAINTENANCE";

  if (
    targetKg == null ||
    !targetDate ||
    weightKg == null ||
    !isAfter(targetDate, new Date())
  ) {
    return patch;
  }

  const metrics = profileToMetricsInput(merged as Profile);
  if (!metrics) return patch;

  const base = recalculateProfileTargets(metrics);
  const calorieTarget = adjustCaloriesForWeightGoal(
    base.calorieTarget,
    weightKg,
    targetKg,
    targetDate,
    nutritionGoal
  );

  return {
    ...patch,
    calorieTarget: patch.calorieTarget == null ? calorieTarget : patch.calorieTarget,
  };
}
