import { unstable_cache } from "next/cache";
import {
  loadNutritionPerformanceContext,
  type NutritionPerformanceLoadResult,
} from "@/lib/intelligence/nutrition-performance/load-context";
import {
  buildNutritionPerformanceIntelligence,
  formatNutritionPerformanceForCoach,
} from "@/lib/intelligence/nutrition-performance/build";
import type { NutritionPerformanceIntelligence } from "@/lib/intelligence/nutrition-performance/types";

export {
  buildNutritionPerformanceIntelligence,
  formatNutritionPerformanceForCoach,
} from "@/lib/intelligence/nutrition-performance/build";
export {
  findMatchingSavedMeals,
  macroStatus,
  mealTimingFromHour,
  mealTimingLabel,
  goalGuidance,
} from "@/lib/intelligence/nutrition-performance/analyze";
export type {
  NutritionPerformanceIntelligence,
  MealRecommendation,
  NutritionRecommendationState,
  MacroStatus,
} from "@/lib/intelligence/nutrition-performance/types";

const CACHE_SECONDS = 300;

async function buildUncached(
  userId: string,
  partial?: Partial<NutritionPerformanceLoadResult> & {
    now?: Date;
    dashboard?: NutritionPerformanceLoadResult["dashboard"];
    savedMeals?: NutritionPerformanceLoadResult["savedMeals"];
    nutritionGoal?: string | null;
    weeklyNutrition?: NutritionPerformanceLoadResult["weeklyNutrition"];
  }
): Promise<NutritionPerformanceIntelligence> {
  const loaded = await loadNutritionPerformanceContext(userId, partial);
  return buildNutritionPerformanceIntelligence(loaded);
}

/**
 * Deterministic nutrition performance intelligence — no OpenAI.
 * Cached server-side (~5 min) per user.
 */
export async function getNutritionPerformanceIntelligence(
  userId: string,
  options?: {
    skipCache?: boolean;
    partial?: Parameters<typeof loadNutritionPerformanceContext>[1];
  }
): Promise<NutritionPerformanceIntelligence> {
  if (options?.skipCache || options?.partial) {
    return buildUncached(userId, options?.partial);
  }

  return unstable_cache(
    () => buildUncached(userId),
    [`nutrition-performance-${userId}`],
    { revalidate: CACHE_SECONDS, tags: [`nutrition-performance-${userId}`] }
  )();
}
