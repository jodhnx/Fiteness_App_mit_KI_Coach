import type { DailyFitnessIntelligence } from "@/lib/intelligence/types";
import type { WeeklyFitnessIntelligence } from "@/lib/intelligence/weekly/types";
import type { SavedMealSummary } from "@/lib/saved-meals-cache";

/** Input for adaptive recommendations — reuses daily/weekly intelligence, no extra DB. */
export type AdaptiveRecommendationContext = {
  now: Date;
  nutritionGoal: string | null;
  daily: DailyFitnessIntelligence | null;
  weekly: WeeklyFitnessIntelligence | null;
  savedMeals?: SavedMealSummary[];
  proteinTargetG?: number | null;
  workoutDaysPerWeek?: number | null;
};
