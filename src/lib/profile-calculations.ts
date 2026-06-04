import type { ActivityLevel, Profile, TrainingGoal } from "@prisma/client";
import type { CalculatedTargets, ProfileMetricsInput } from "@/lib/profile-types";
import { calculateMacros, trainingGoalFromNutritionGoal } from "@/lib/nutrition";
import { computeCaloriePlan, type CaloriePlanContext } from "@/lib/calorie-target";
import { recommendedTrainingDays } from "@/lib/profile-training-days";

export { recommendedTrainingDays } from "@/lib/profile-training-days";

export function calculateBMI(weightKg: number, heightCm: number): number {
  const h = heightCm / 100;
  return Math.round((weightKg / (h * h)) * 10) / 10;
}

export type { ProfileMetricsInput, CalculatedTargets } from "@/lib/profile-types";

export function recalculateProfileTargets(
  input: ProfileMetricsInput,
  context?: CaloriePlanContext,
  targetWeightKg?: number | null,
  targetWeightDate?: Date | null
): CalculatedTargets {
  const trainingGoal =
    input.trainingGoal ?? trainingGoalFromNutritionGoal(input.nutritionGoal);
  const plan = computeCaloriePlan({
    age: input.age,
    weightKg: input.weightKg,
    heightCm: input.heightCm,
    gender: input.gender,
    activityLevel: input.activityLevel,
    nutritionGoal: input.nutritionGoal,
    trainingGoal,
    workoutDaysPerWeek: input.workoutDaysPerWeek,
    targetWeightKg: targetWeightKg ?? null,
    targetWeightDate: targetWeightDate ?? null,
    context,
  });
  const macros = calculateMacros(plan.calorieTarget, trainingGoal, input.nutritionGoal);

  return {
    bmi: calculateBMI(input.weightKg, input.heightCm),
    bmr: plan.bmr,
    calorieTarget: plan.calorieTarget,
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

export { EXPERIENCE_LABELS } from "@/lib/profile-training-days";
