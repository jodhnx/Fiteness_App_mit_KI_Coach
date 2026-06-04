import { differenceInDays, isAfter } from "date-fns";
import type { ActivityLevel, Gender, NutritionGoal, Profile, TrainingGoal } from "@prisma/client";
import {
  profileToMetricsInput,
  recalculateProfileTargets,
  type CalculatedTargets,
  type ProfileMetricsInput,
} from "@/lib/profile-calculations";
import { trainingGoalFromNutritionGoal } from "@/lib/nutrition";

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

/** Single source of truth for daily calorie target from profile (incl. smart weight goal). */
export function resolveCalorieTarget(profile: Profile): number | null {
  const metrics = profileToMetricsInput(profile);
  if (!metrics || profile.weightKg == null) return null;

  const base = recalculateProfileTargets(metrics);
  const targetKg = profile.targetWeightKg;
  const targetDate = profile.targetWeightDate;
  const nutritionGoal = profile.nutritionGoal ?? "MAINTENANCE";

  if (targetKg != null && targetDate && isAfter(targetDate, new Date())) {
    return adjustCaloriesForWeightGoal(
      base.calorieTarget,
      profile.weightKg,
      targetKg,
      targetDate,
      nutritionGoal
    );
  }

  return base.calorieTarget;
}

export function computeProfileTargets(profile: Profile): CalculatedTargets | null {
  const metrics = profileToMetricsInput(profile);
  if (!metrics) return null;

  const base = recalculateProfileTargets(metrics);
  const calories = resolveCalorieTarget(profile);
  if (calories == null) return null;

  const ratio = base.calorieTarget > 0 ? calories / base.calorieTarget : 1;

  return {
    ...base,
    calorieTarget: calories,
    proteinTargetG: Math.round(base.proteinTargetG * ratio),
    carbsTargetG: Math.round(base.carbsTargetG * ratio),
    fatTargetG: Math.round(base.fatTargetG * ratio),
  };
}

export type NutritionTargets = {
  calories: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  waterTargetMl: number;
  nutritionGoal: Profile["nutritionGoal"];
  profileComplete: boolean;
};

export function nutritionTargetsFromProfile(profile: Profile | null): NutritionTargets {
  const profileComplete = Boolean(
    profile?.weightKg &&
      profile.heightCm &&
      profile.age &&
      profile.gender &&
      profile.activityLevel
  );

  if (!profile || !profileComplete) {
    return {
      calories: 0,
      proteinG: 0,
      carbsG: 0,
      fatG: 0,
      waterTargetMl: profile?.waterTargetMl ?? 2500,
      nutritionGoal: profile?.nutritionGoal ?? null,
      profileComplete: false,
    };
  }

  const computed = computeProfileTargets(profile);
  if (!computed) {
    return {
      calories: 0,
      proteinG: 0,
      carbsG: 0,
      fatG: 0,
      waterTargetMl: profile.waterTargetMl ?? 2500,
      nutritionGoal: profile.nutritionGoal ?? null,
      profileComplete: false,
    };
  }

  return {
    calories: computed.calorieTarget,
    proteinG: computed.proteinTargetG,
    carbsG: computed.carbsTargetG,
    fatG: computed.fatTargetG,
    waterTargetMl: profile.waterTargetMl ?? 2500,
    nutritionGoal: profile.nutritionGoal ?? null,
    profileComplete: true,
  };
}

/** Client-side preview from settings form fields */
export function previewTargetsFromForm(fields: {
  age?: string | number;
  weightKg?: string | number;
  heightCm?: string | number;
  gender?: Gender | string;
  activityLevel?: ActivityLevel;
  trainingGoal?: TrainingGoal;
  nutritionGoal?: NutritionGoal;
  workoutDaysPerWeek?: string | number;
  targetWeightKg?: string | number;
  targetWeightDate?: string;
}): CalculatedTargets | null {
  const age = Number(fields.age);
  const weightKg = Number(fields.weightKg);
  const heightCm = Number(fields.heightCm);
  if (
    !Number.isFinite(age) ||
    !Number.isFinite(weightKg) ||
    !Number.isFinite(heightCm) ||
    !fields.gender ||
    !fields.activityLevel ||
    !fields.nutritionGoal
  ) {
    return null;
  }

  const nutritionGoal = fields.nutritionGoal as NutritionGoal;
  const trainingGoal =
    (fields.trainingGoal as TrainingGoal) ?? trainingGoalFromNutritionGoal(nutritionGoal);
  const workoutDays = fields.workoutDaysPerWeek
    ? Number(fields.workoutDaysPerWeek)
    : undefined;

  const metrics: ProfileMetricsInput = {
    age,
    weightKg,
    heightCm,
    gender: fields.gender as Gender,
    activityLevel: fields.activityLevel as ActivityLevel,
    trainingGoal,
    nutritionGoal,
    workoutDaysPerWeek: Number.isFinite(workoutDays) ? workoutDays : undefined,
  };

  const base = recalculateProfileTargets(metrics);
  const targetKg = fields.targetWeightKg ? Number(fields.targetWeightKg) : null;
  const targetDateStr = fields.targetWeightDate?.trim();
  let calorieTarget = base.calorieTarget;

  if (targetKg != null && Number.isFinite(targetKg) && targetDateStr) {
    const targetDate = new Date(targetDateStr);
    if (isAfter(targetDate, new Date())) {
      calorieTarget = adjustCaloriesForWeightGoal(
        base.calorieTarget,
        weightKg,
        targetKg,
        targetDate,
        nutritionGoal
      );
    }
  }

  const ratio = base.calorieTarget > 0 ? calorieTarget / base.calorieTarget : 1;
  return {
    ...base,
    calorieTarget,
    proteinTargetG: Math.round(base.proteinTargetG * ratio),
    carbsTargetG: Math.round(base.carbsTargetG * ratio),
    fatTargetG: Math.round(base.fatTargetG * ratio),
  };
}
