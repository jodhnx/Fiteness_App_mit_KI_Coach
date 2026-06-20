import type { ActivityLevel, Gender } from "@prisma/client";
import type { MainGoalKey } from "@/lib/onboarding-options";
import { ACTIVITY_MULTIPLIERS } from "@/lib/calorie-target";

export type RegistrationGoalKey =
  | "GAIN_MUSCLE"
  | "LOSE_WEIGHT"
  | "MAINTAIN"
  | "STRENGTH";

const GOAL_FACTOR: Record<RegistrationGoalKey, number> = {
  GAIN_MUSCLE: 1.2,
  LOSE_WEIGHT: 0.8,
  MAINTAIN: 1.0,
  STRENGTH: 1.15,
};

function genderConstant(gender: Gender): number {
  if (gender === "MALE") return 5;
  if (gender === "FEMALE") return -161;
  return -78;
}

/** Mifflin-St Jeor BMR */
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

/** Preview calories for registration summary (BMR × activity × goal factor) */
export function calculateRegistrationCalories(input: {
  weightKg: number;
  heightCm: number;
  age: number;
  gender: Gender;
  trainingDaysPerWeek: number;
  goal: RegistrationGoalKey;
}): { bmr: number; tdee: number; calorieTarget: number } {
  const bmr = Math.round(calculateBmrMifflin(input.weightKg, input.heightCm, input.age, input.gender));
  const activity = activityLevelFromTrainingDays(input.trainingDaysPerWeek);
  const tdee = Math.round(bmr * ACTIVITY_MULTIPLIERS[activity]);
  const calorieTarget = Math.round(tdee * GOAL_FACTOR[input.goal]);
  return { bmr, tdee, calorieTarget: Math.max(1200, calorieTarget) };
}
