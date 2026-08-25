import type { HomeDataPayload } from "@/lib/home-defaults";
import type { SavedMealSummary } from "@/lib/saved-meals-cache";
import { buildDailyActionPlan } from "@/lib/intelligence/daily-plan/build";
import type { DailyActionPlan } from "@/lib/intelligence/daily-plan/types";
import { buildNutritionPerformanceIntelligence } from "@/lib/intelligence/nutrition-performance/build";

/** Build daily plan from home payload — no DB, no OpenAI. */
export function buildDailyActionPlanFromHome(
  home: HomeDataPayload,
  options: { now?: Date; savedMeals?: SavedMealSummary[] } = {}
): DailyActionPlan {
  const now = options.now ?? new Date();
  const nutritionPerformance = home.nutrition
    ? buildNutritionPerformanceIntelligence({
        now,
        dashboard: home.nutrition,
        savedMeals: options.savedMeals ?? [],
        nutritionGoal:
          home.nutrition.targets?.nutritionGoal ??
          null,
        weeklyNutrition: home.weeklyIntelligence?.nutrition ?? null,
      })
    : null;

  return buildDailyActionPlan({
    now,
    daily: home.intelligence ?? null,
    weekly: home.weeklyIntelligence ?? null,
    adaptive: home.adaptiveRecommendations ?? null,
    trainingPerformance: home.trainingPerformance ?? null,
    nutritionPerformance,
    nextWorkout: home.nextWorkout
      ? { planName: home.nextWorkout.planName, dayName: home.nextWorkout.dayName }
      : null,
    trainingDoneToday: home.intelligence?.training.doneToday ?? false,
    activeSession: Boolean(home.activeSession?.id),
    recoveryScore: home.healthToday?.recoveryScore ?? null,
    trainingReadiness: home.healthToday?.trainingReadiness ?? null,
    nutritionGoal: home.nutrition?.targets?.nutritionGoal ?? null,
  });
}
