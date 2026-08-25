import type { NutritionDashboardPayload } from "@/lib/nutrition-defaults";

/** Input for deterministic intelligence — no OpenAI. */
export type IntelligenceContext = {
  now: Date;
  nutrition: NutritionDashboardPayload | null;
  proteinRemaining: number;
  caloriesRemaining: number;
  calorieTarget: number;
  proteinTarget: number;
  proteinConsumed: number;
  caloriesConsumed: number;
  nutritionGoal: string | null;
  trainingDoneToday: boolean;
  trainingPlanned: boolean;
  activeSession: boolean;
  nextWorkoutLabel: string | null;
  trainingStreakDays: number;
  weightKg: number | null;
  targetWeightKg: number | null;
  weightEntries: { date: Date; weightKg: number }[];
  recentPr: {
    exerciseName: string;
    weightKg: number | null;
    value: number;
    achievedAt: Date;
  } | null;
  sessionImprovement: { exerciseName: string; detail: string } | null;
  steps: number | null;
  stepGoal: number | null;
  sleepHours: number | null;
  recoveryScore: number | null;
  workoutsThisWeek: number | null;
};
