import type { HomeDataPayload } from "@/lib/home-defaults";
import type { NutritionDashboardPayload } from "@/lib/nutrition-defaults";
import { startOfDay, isSameDay } from "date-fns";
import type { IntelligenceContext } from "@/lib/intelligence/context";
import { buildDailyIntelligenceFromContext } from "@/lib/intelligence/build-from-context";
import type { DailyFitnessIntelligence } from "@/lib/intelligence/types";

/** Map bundled home payload → intelligence context (no extra queries). */
export function homePayloadToIntelligenceContext(
  home: HomeDataPayload,
  nutrition?: NutritionDashboardPayload | null,
  weightEntries: { date: Date; weightKg: number }[] = []
): IntelligenceContext {
  const now = new Date();
  const n = nutrition ?? home.nutrition ?? null;
  const completedToday =
    home.lastCompletedWorkout?.completedAt &&
    isSameDay(new Date(home.lastCompletedWorkout.completedAt), now);

  return {
    now,
    nutrition: n,
    proteinRemaining: home.proteinRemaining,
    caloriesRemaining: home.caloriesRemaining,
    calorieTarget: home.calorieTarget,
    proteinTarget: home.proteinTarget,
    proteinConsumed: home.proteinConsumed,
    caloriesConsumed: home.caloriesIntake,
    nutritionGoal: n?.targets?.nutritionGoal ?? null,
    trainingDoneToday: Boolean(completedToday),
    trainingPlanned: Boolean(home.nextWorkout?.dayId),
    activeSession: Boolean(home.activeSession?.id),
    nextWorkoutLabel: home.nextWorkout
      ? `${home.nextWorkout.planName} — ${home.nextWorkout.dayName}`
      : null,
    trainingStreakDays:
      home.trainingStreak?.currentDays ?? home.streak?.currentDays ?? 0,
    weightKg: home.weightKg,
    targetWeightKg: home.weightGoal?.targetKg ?? null,
    weightEntries,
    recentPr: null,
    sessionImprovement: null,
    steps: home.healthToday?.steps ?? null,
    stepGoal: home.healthToday?.stepGoal ?? 10_000,
    sleepHours: home.healthToday?.sleepHours ?? null,
    recoveryScore: home.healthToday?.recoveryScore ?? null,
    workoutsThisWeek: home.weeklyReport?.workouts ?? home.activityWeek?.count ?? null,
  };
}

export function buildDailyIntelligenceFromHome(
  home: HomeDataPayload,
  nutrition?: NutritionDashboardPayload | null,
  weightEntries: { date: Date; weightKg: number }[] = []
): DailyFitnessIntelligence {
  return buildDailyIntelligenceFromContext(
    homePayloadToIntelligenceContext(home, nutrition, weightEntries)
  );
}

export function isTrainingDoneToday(home: HomeDataPayload, now = new Date()): boolean {
  return Boolean(
    home.lastCompletedWorkout?.completedAt &&
      startOfDay(new Date(home.lastCompletedWorkout.completedAt)).getTime() ===
        startOfDay(now).getTime()
  );
}
