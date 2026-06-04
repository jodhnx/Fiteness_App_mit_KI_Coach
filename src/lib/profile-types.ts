import type {
  ActivityLevel,
  Gender,
  NutritionGoal,
  TrainingGoal,
} from "@prisma/client";

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
