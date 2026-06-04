import type { ActivityLevel, Gender, NutritionGoal, TrainingGoal } from "@prisma/client";
import {
  ACTIVITY_MULTIPLIERS,
  computeCaloriePlan,
  type CaloriePlanContext,
} from "@/lib/calorie-target";

export { ACTIVITY_MULTIPLIERS };

const TRAINING_GOAL_TO_NUTRITION: Partial<Record<TrainingGoal, NutritionGoal>> = {
  LOSE_WEIGHT: "FAT_LOSS",
  GAIN_MUSCLE: "MUSCLE_GAIN",
  MAINTAIN: "MAINTENANCE",
  STRENGTH: "MUSCLE_GAIN",
  ENDURANCE: "MAINTENANCE",
  GENERAL_FITNESS: "MAINTENANCE",
};

export function calculateBMR(
  weightKg: number,
  heightCm: number,
  age: number,
  gender: Gender
): number {
  if (gender === "MALE") {
    return 10 * weightKg + 6.25 * heightCm - 5 * age + 5;
  }
  return 10 * weightKg + 6.25 * heightCm - 5 * age - 161;
}

/** TDEE ohne Ziel-% (nur BMR × Aktivitätsfaktor) */
export function calculateTDEE(
  weightKg: number,
  heightCm: number,
  age: number,
  gender: Gender,
  activityLevel: ActivityLevel,
  _trainingGoal?: TrainingGoal
): number {
  const bmr = calculateBMR(weightKg, heightCm, age, gender);
  return Math.round(bmr * ACTIVITY_MULTIPLIERS[activityLevel]);
}

/** Tagesziel-Kalorien inkl. Ziel, Training, optional Kontext */
export function calculateTDEEForNutritionGoal(
  weightKg: number,
  heightCm: number,
  age: number,
  gender: Gender,
  activityLevel: ActivityLevel,
  nutritionGoal: NutritionGoal,
  options?: {
    trainingGoal?: TrainingGoal;
    workoutDaysPerWeek?: number | null;
    targetWeightKg?: number | null;
    targetWeightDate?: Date | null;
    context?: CaloriePlanContext;
  }
): number {
  const plan = computeCaloriePlan({
    age,
    weightKg,
    heightCm,
    gender,
    activityLevel,
    nutritionGoal,
    trainingGoal: options?.trainingGoal,
    workoutDaysPerWeek: options?.workoutDaysPerWeek,
    targetWeightKg: options?.targetWeightKg,
    targetWeightDate: options?.targetWeightDate,
    context: options?.context,
  });
  return plan.calorieTarget;
}

export function trainingGoalFromNutritionGoal(goal: NutritionGoal): TrainingGoal {
  switch (goal) {
    case "FAT_LOSS":
      return "LOSE_WEIGHT";
    case "MUSCLE_GAIN":
    case "LEAN_BULK":
      return "GAIN_MUSCLE";
    case "RECOMP":
      return "GENERAL_FITNESS";
    default:
      return "MAINTAIN";
  }
}

export function nutritionGoalFromTrainingGoal(goal: TrainingGoal): NutritionGoal {
  return TRAINING_GOAL_TO_NUTRITION[goal] ?? "MAINTENANCE";
}

export function calculateMacros(
  calories: number,
  trainingGoal: TrainingGoal,
  nutritionGoal?: NutritionGoal | null
) {
  let proteinRatio = 0.3;
  let fatRatio = 0.25;

  const goal = nutritionGoal ?? null;
  if (
    goal === "MUSCLE_GAIN" ||
    goal === "LEAN_BULK" ||
    trainingGoal === "GAIN_MUSCLE" ||
    trainingGoal === "STRENGTH"
  ) {
    proteinRatio = 0.32;
    fatRatio = 0.22;
  } else if (goal === "FAT_LOSS" || trainingGoal === "LOSE_WEIGHT") {
    proteinRatio = 0.35;
    fatRatio = 0.28;
  } else if (goal === "RECOMP") {
    proteinRatio = 0.33;
    fatRatio = 0.25;
  } else if (trainingGoal === "ENDURANCE") {
    proteinRatio = 0.25;
    fatRatio = 0.22;
  }

  const proteinG = Math.round((calories * proteinRatio) / 4);
  const fatG = Math.round((calories * fatRatio) / 9);
  const carbsG = Math.round((calories - proteinG * 4 - fatG * 9) / 4);
  return { proteinG, carbsG, fatG, calories };
}

export const NUTRITION_GOAL_LABELS: Record<NutritionGoal, string> = {
  MUSCLE_GAIN: "Aufbau",
  FAT_LOSS: "Cut",
  MAINTENANCE: "Erhaltung",
  LEAN_BULK: "Lean Bulk",
  RECOMP: "Recomp",
};

export { MEAL_TYPE_LABELS, MEAL_TYPE_ORDER, MEAL_TYPE_SHORT } from "@/lib/meal-types";
