import { differenceInDays } from "date-fns";
import type { Profile } from "@prisma/client";
import { profileToMetricsInput } from "@/lib/profile-calculations";
import { computeProfileTargets, resolveCalorieTarget } from "@/lib/calorie-target";

export type WeightGoalProgress = {
  currentKg: number;
  targetKg: number;
  startKg: number;
  percent: number;
  daysRemaining: number;
  projectedKgPerWeek: number;
  onTrack: boolean;
  recommendedCalories?: number;
};

export type WeightGoalProfileInput = {
  weightKg: number | null;
  targetWeightKg: number | null;
  targetWeightDate: Date | null;
};

const RECALC_TRIGGER_KEYS = [
  "weightKg",
  "targetWeightKg",
  "targetWeightDate",
  "activityLevel",
  "workoutDaysPerWeek",
  "nutritionGoal",
  "trainingGoal",
  "heightCm",
  "age",
  "gender",
] as const;

export function shouldRecalculateCalories(patch: Record<string, unknown>): boolean {
  return RECALC_TRIGGER_KEYS.some((k) => patch[k] !== undefined);
}

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

export { adjustCaloriesForWeightGoal } from "@/lib/calorie-target";

export function smartGoalCaloriePreview(profile: Profile): {
  calorieTarget: number;
  weightProjection: string;
  projectedKgPerWeek?: number;
  daysRemaining?: number;
} | null {
  const metrics = profileToMetricsInput(profile);
  if (!metrics || !profile.targetWeightKg || !profile.targetWeightDate) return null;

  const calorieTarget = resolveCalorieTarget(profile);
  if (calorieTarget == null) return null;

  const progress = computeWeightGoalProgress(profile);
  const projection = progress
    ? `~${progress.projectedKgPerWeek > 0 ? "+" : ""}${progress.projectedKgPerWeek} kg/Woche · ${progress.daysRemaining} Tage`
    : "";

  return {
    calorieTarget,
    weightProjection: projection,
    projectedKgPerWeek: progress?.projectedKgPerWeek,
    daysRemaining: progress?.daysRemaining,
  };
}

/** Auto-update calories when weight, goals, activity or training frequency change. */
export function applySmartGoalsToProfilePatch(
  existing: Profile | null,
  patch: Record<string, unknown>
): Record<string, unknown> {
  const { manualCalorieTarget, ...rest } = patch;
  const merged = { ...(existing ?? {}), ...rest } as Profile;
  const recalc = shouldRecalculateCalories(rest);
  const manual = manualCalorieTarget === true;

  if (!recalc && manual && rest.calorieTarget != null) {
    return rest;
  }
  if (!recalc && !manual) {
    return rest;
  }

  const computed = computeProfileTargets(merged);
  if (!computed) return rest;

  if (manual && !recalc) {
    return {
      ...rest,
      bmi: rest.bmi == null ? computed.bmi : rest.bmi,
    };
  }

  return {
    ...rest,
    calorieTarget: computed.calorieTarget,
    proteinTargetG: rest.proteinTargetG == null ? computed.proteinTargetG : rest.proteinTargetG,
    carbsTargetG: rest.carbsTargetG == null ? computed.carbsTargetG : rest.carbsTargetG,
    fatTargetG: rest.fatTargetG == null ? computed.fatTargetG : rest.fatTargetG,
    bmi: rest.bmi == null ? computed.bmi : rest.bmi,
  };
}
