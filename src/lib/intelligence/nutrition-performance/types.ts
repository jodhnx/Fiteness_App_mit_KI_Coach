import type { IntelligenceAction } from "@/lib/intelligence/types";

export type MacroStatus =
  | "under_target"
  | "on_target"
  | "over_target"
  | "insufficient_data";

export type MealTiming = "morning" | "midday" | "afternoon" | "evening";

export type NutritionRecommendationState =
  | "on_track"
  | "needs_attention"
  | "protein_priority"
  | "calorie_priority"
  | "macro_balance"
  | "tracking_low"
  | "insufficient_data"
  | "no_action_needed";

export type NutritionPerformanceConfidence = "high" | "medium" | "low";

export type TodayMealSummary = {
  mealType: string;
  label: string;
  calories: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  itemCount: number;
};

export type MacroSnapshot = {
  target: number | null;
  consumed: number | null;
  remaining: number | null;
  status: MacroStatus;
};

export type MealRecommendation = {
  id: string;
  mealId: string;
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  reason: string;
  fitScore: number;
  confidence: NutritionPerformanceConfidence;
  action: IntelligenceAction;
  remainingAfter: {
    proteinG: number | null;
    calories: number | null;
  } | null;
};

export type NutritionPerformanceIntelligence = {
  generatedAt: string;
  mealTiming: MealTiming;
  mealTimingLabel: string;
  nutritionGoal: string | null;
  mealCount: number;
  calories: MacroSnapshot;
  protein: MacroSnapshot;
  carbs: MacroSnapshot;
  fat: MacroSnapshot;
  waterMl: { consumed: number | null; target: number | null };
  todayMeals: TodayMealSummary[];
  recommendationState: NutritionRecommendationState;
  confidence: NutritionPerformanceConfidence;
  primary: MealRecommendation | null;
  secondary: MealRecommendation[];
  weeklyProteinDays: string | null;
  weeklyNutritionStatus: string | null;
  explanation: string;
  evidence: string[];
  coachContext: {
    summary: string;
    items: {
      title: string;
      explanation: string;
      evidence: string[];
      confidence: NutritionPerformanceConfidence;
      requiresConfirmation: boolean;
    }[];
  };
};
