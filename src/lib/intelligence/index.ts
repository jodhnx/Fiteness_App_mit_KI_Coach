import { buildDailyIntelligenceFromContext } from "@/lib/intelligence/build-from-context";
import { loadIntelligenceContext } from "@/lib/intelligence/load-context";
import type { DailyFitnessIntelligence } from "@/lib/intelligence/types";
import type { IntelligenceContext } from "@/lib/intelligence/context";

export { buildDailyIntelligenceFromContext } from "@/lib/intelligence/build-from-context";

/**
 * Public API for AI Coach 2.0 and server routes.
 * Deterministic — no OpenAI calls.
 */
export async function getDailyFitnessIntelligence(
  userId: string,
  partial?: Partial<IntelligenceContext>
): Promise<DailyFitnessIntelligence> {
  const ctx = await loadIntelligenceContext(userId, partial);
  return buildDailyIntelligenceFromContext(ctx);
}

export {
  buildDailyIntelligenceFromHome,
  homePayloadToIntelligenceContext,
} from "@/lib/intelligence/from-home";
export type {
  DailyFitnessIntelligence,
  IntelligenceRecommendation,
  IntelligenceRecommendationType,
} from "@/lib/intelligence/types";
export type { IntelligenceContext } from "@/lib/intelligence/context";
export {
  getWeeklyFitnessIntelligence,
  buildWeeklyIntelligenceFromContext,
  buildWeeklyIntelligenceFromHome,
  formatWeeklyIntelligenceForCoach,
} from "@/lib/intelligence/weekly";
export type {
  WeeklyFitnessIntelligence,
  WeeklyAchievement,
} from "@/lib/intelligence/weekly";
export {
  buildAdaptiveRecommendations,
  formatAdaptiveRecommendationsForCoach,
  filterAdaptiveRecommendationsForCoach,
} from "@/lib/intelligence/recommendations";
export {
  rebuildHomeIntelligenceLayers,
  commitHomeIntelligenceRefresh,
  patchHomeAfterWorkoutComplete,
  weightEntriesFromProgressCache,
} from "@/lib/intelligence/client-refresh";
export {
  getTrainingPerformanceIntelligence,
  formatTrainingPerformanceForCoach,
} from "@/lib/intelligence/training-performance";
export type {
  TrainingPerformanceIntelligence,
  ExercisePerformanceInsight,
} from "@/lib/intelligence/training-performance";
export {
  getNutritionPerformanceIntelligence,
  formatNutritionPerformanceForCoach,
  buildNutritionPerformanceIntelligence,
  findMatchingSavedMeals,
} from "@/lib/intelligence/nutrition-performance";
export { loadNutritionPerformanceContext } from "@/lib/intelligence/nutrition-performance/load-context";
export type {
  NutritionPerformanceIntelligence,
  MealRecommendation,
} from "@/lib/intelligence/nutrition-performance";
export {
  buildDailyActionPlan,
  buildDailyActionPlanFromHome,
  formatDailyActionPlanForCoach,
} from "@/lib/intelligence/daily-plan";
export type { DailyActionPlan, DailyPlanAction } from "@/lib/intelligence/daily-plan";
export type {
  AdaptiveRecommendation,
  AdaptiveRecommendations,
  AdaptiveRecommendationContext,
} from "@/lib/intelligence/recommendations";
