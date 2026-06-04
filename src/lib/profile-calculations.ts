import type {
  ActivityLevel,
  Gender,
  NutritionGoal,
  PlanLevel,
  Profile,
  TrainingGoal,
} from "@prisma/client";
import {
  calculateBMR,
  calculateTDEEForNutritionGoal,
  calculateMacros,
  trainingGoalFromNutritionGoal,
} from "@/lib/nutrition";

export function calculateBMI(weightKg: number, heightCm: number): number {
  const h = heightCm / 100;
  return Math.round((weightKg / (h * h)) * 10) / 10;
}

export function recommendedTrainingDays(
  workoutDaysPerWeek: number | null | undefined,
  trainingGoal: TrainingGoal
): number {
  if (workoutDaysPerWeek && workoutDaysPerWeek >= 2 && workoutDaysPerWeek <= 6) {
    return workoutDaysPerWeek;
  }
  switch (trainingGoal) {
    case "STRENGTH":
    case "GAIN_MUSCLE":
      return 4;
    case "ENDURANCE":
      return 5;
    case "LOSE_WEIGHT":
      return 4;
    default:
      return 3;
  }
}

export type ProfileMetricsInput = {
  age: number;
  weightKg: number;
  heightCm: number;
  gender: Gender;
  activityLevel: ActivityLevel;
  trainingGoal: TrainingGoal;
  nutritionGoal: NutritionGoal;
  workoutDaysPerWeek?: number | null;
};

export type CalculatedTargets = {
  bmi: number;
  bmr: number;
  calorieTarget: number;
  proteinTargetG: number;
  carbsTargetG: number;
  fatTargetG: number;
  recommendedTrainingDays: number;
};

export function recalculateProfileTargets(
  input: ProfileMetricsInput
): CalculatedTargets {
  const bmi = calculateBMI(input.weightKg, input.heightCm);
  const bmr = Math.round(
    calculateBMR(input.weightKg, input.heightCm, input.age, input.gender)
  );
  const calories = calculateTDEEForNutritionGoal(
    input.weightKg,
    input.heightCm,
    input.age,
    input.gender,
    input.activityLevel,
    input.nutritionGoal
  );
  const trainingGoal =
    input.trainingGoal ?? trainingGoalFromNutritionGoal(input.nutritionGoal);
  const macros = calculateMacros(calories, trainingGoal, input.nutritionGoal);

  return {
    bmi,
    bmr,
    calorieTarget: macros.calories,
    proteinTargetG: macros.proteinG,
    carbsTargetG: macros.carbsG,
    fatTargetG: macros.fatG,
    recommendedTrainingDays: recommendedTrainingDays(
      input.workoutDaysPerWeek,
      trainingGoal
    ),
  };
}

export function profileToMetricsInput(
  profile: Profile
): ProfileMetricsInput | null {
  if (
    !profile.age ||
    !profile.weightKg ||
    !profile.heightCm ||
    !profile.gender ||
    !profile.activityLevel
  ) {
    return null;
  }
  const nutritionGoal = profile.nutritionGoal ?? "MAINTENANCE";
  const trainingGoal =
    profile.trainingGoal ?? trainingGoalFromNutritionGoal(nutritionGoal);
  return {
    age: profile.age,
    weightKg: profile.weightKg,
    heightCm: profile.heightCm,
    gender: profile.gender,
    activityLevel: profile.activityLevel,
    trainingGoal,
    nutritionGoal,
    workoutDaysPerWeek: profile.workoutDaysPerWeek,
  };
}

export function isOnboardingProfileComplete(profile: Profile | null): boolean {
  return Boolean(
    profile?.age &&
      profile.weightKg &&
      profile.heightCm &&
      profile.gender &&
      profile.activityLevel &&
      profile.nutritionGoal &&
      profile.trainingGoal &&
      profile.experienceLevel &&
      profile.workoutDaysPerWeek
  );
}

export const TRAINING_GOAL_LABELS: Record<TrainingGoal, string> = {
  LOSE_WEIGHT: "Fettabbau",
  GAIN_MUSCLE: "Muskelaufbau",
  MAINTAIN: "Erhaltung",
  ENDURANCE: "Ausdauer",
  STRENGTH: "Kraftaufbau",
  GENERAL_FITNESS: "Allgemeine Fitness",
};

export const ACTIVITY_LABELS: Record<ActivityLevel, string> = {
  SEDENTARY: "Kaum aktiv",
  LIGHT: "Leicht aktiv",
  MODERATE: "Aktiv",
  ACTIVE: "Aktiv",
  VERY_ACTIVE: "Sehr aktiv",
};

export const EXPERIENCE_LABELS: Record<PlanLevel, string> = {
  BEGINNER: "Anfänger",
  INTERMEDIATE: "Fortgeschritten",
  ADVANCED: "Advanced",
  PRO: "Pro",
};
