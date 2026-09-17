/**
 * Registration calorie helpers — delegates to the central calorie plan.
 * Kept for API compatibility; do not invent a second formula here.
 */

import type { ActivityLevel, Gender } from "@prisma/client";
import type { MainGoalKey } from "@/lib/onboarding-options";
import { defaultNutritionGoalForMainGoal } from "@/lib/onboarding-options";
import { calculateBMR } from "@/lib/nutrition";
import {
  ACTIVITY_MULTIPLIERS,
  calculateNutritionTargets,
  computeCaloriePlan,
} from "@/lib/calorie-target";
import { trainingGoalFromNutritionGoal } from "@/lib/nutrition";

export type RegistrationGoalKey =
  | "GAIN_MUSCLE"
  | "LOSE_WEIGHT"
  | "MAINTAIN"
  | "STRENGTH";

function genderConstant(gender: Gender): number {
  if (gender === "MALE") return 5;
  if (gender === "FEMALE") return -161;
  return -78;
}

/** Mifflin-St Jeor BMR (OTHER uses midpoint constant). */
export function calculateBmrMifflin(
  weightKg: number,
  heightCm: number,
  age: number,
  gender: Gender
): number {
  return 10 * weightKg + 6.25 * heightCm - 5 * age + genderConstant(gender);
}

export function activityLevelFromTrainingDays(days: number): ActivityLevel {
  if (days <= 1) return "SEDENTARY";
  if (days <= 2) return "LIGHT";
  if (days <= 4) return "MODERATE";
  if (days <= 5) return "ACTIVE";
  return "VERY_ACTIVE";
}

export function mainGoalKeyFromRegistrationGoal(
  goal: RegistrationGoalKey
): MainGoalKey {
  switch (goal) {
    case "GAIN_MUSCLE":
      return "GAIN_MUSCLE";
    case "LOSE_WEIGHT":
      return "LOSE_WEIGHT";
    case "MAINTAIN":
      return "ENDURANCE";
    case "STRENGTH":
      return "STRENGTH";
    default:
      return "GENERAL_FITNESS";
  }
}

/** Preview calories for registration summary — uses central plan. */
export function calculateRegistrationCalories(input: {
  weightKg: number;
  heightCm: number;
  age: number;
  gender: Gender;
  trainingDaysPerWeek: number;
  goal: RegistrationGoalKey;
}): { bmr: number; tdee: number; calorieTarget: number } {
  const mainKey = mainGoalKeyFromRegistrationGoal(input.goal);
  const nutritionGoal = defaultNutritionGoalForMainGoal(mainKey);
  const activity = activityLevelFromTrainingDays(input.trainingDaysPerWeek);
  const trainingGoal = trainingGoalFromNutritionGoal(nutritionGoal);
  const plan = computeCaloriePlan({
    age: input.age,
    weightKg: input.weightKg,
    heightCm: input.heightCm,
    gender: input.gender,
    activityLevel: activity,
    nutritionGoal,
    trainingGoal,
    workoutDaysPerWeek: input.trainingDaysPerWeek,
  });
  return {
    bmr: plan.bmr,
    tdee: plan.adjustedTdee,
    calorieTarget: plan.calorieTarget,
  };
}

export { ACTIVITY_MULTIPLIERS, calculateNutritionTargets, calculateBMR };
