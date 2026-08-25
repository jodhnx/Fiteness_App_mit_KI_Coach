import type { SavedMealSummary } from "@/lib/saved-meals-cache";
import type {
  MacroStatus,
  MealTiming,
  NutritionPerformanceConfidence,
} from "@/lib/intelligence/nutrition-performance/types";

const PROTEIN_DONE_G = 8;
const PROTEIN_WARN_G = 25;
const CALORIES_WARN_KCAL = 400;
const CALORIES_OVER_KCAL = 200;

export function mealTimingFromHour(hour: number): MealTiming {
  if (hour < 11) return "morning";
  if (hour < 14) return "midday";
  if (hour < 18) return "afternoon";
  return "evening";
}

export function mealTimingLabel(timing: MealTiming): string {
  switch (timing) {
    case "morning":
      return "Vormittag — typisch Frühstück";
    case "midday":
      return "Mittag — typisch Mittagessen";
    case "afternoon":
      return "Nachmittag — Snack / Pre-Workout möglich";
    default:
      return "Abend — typisch Abendessen";
  }
}

export function macroStatus(
  target: number | null | undefined,
  consumed: number | null | undefined,
  remaining: number | null | undefined,
  kind: "protein" | "calories" | "carbs" | "fat"
): MacroStatus {
  if (target == null || target <= 0 || consumed == null) {
    return "insufficient_data";
  }
  const rem = remaining ?? Math.max(0, target - consumed);

  if (kind === "protein") {
    if (rem <= PROTEIN_DONE_G) return "on_target";
    if (consumed > target + 5) return "over_target";
    if (rem > PROTEIN_WARN_G) return "under_target";
    return "on_target";
  }

  if (kind === "calories") {
    if (rem < -CALORIES_OVER_KCAL) return "over_target";
    if (rem <= 300 && rem >= -150) return "on_target";
    if (rem > CALORIES_WARN_KCAL) return "under_target";
    return "on_target";
  }

  if (kind === "carbs" || kind === "fat") {
    if (rem <= Math.max(5, target * 0.08)) return "on_target";
    if (consumed > target + Math.max(10, target * 0.1)) return "over_target";
    if (rem > Math.max(15, target * 0.2)) return "under_target";
    return "on_target";
  }

  return "insufficient_data";
}

export type SavedMealMatch = {
  meal: SavedMealSummary;
  fitScore: number;
  reason: string;
  remainingAfter: { proteinG: number | null; calories: number | null };
};

/** Deterministic saved-meal matching — extends protein search with calorie/macro fit. */
export function findMatchingSavedMeals(
  meals: SavedMealSummary[] | undefined,
  options: {
    proteinRemainingG: number | null;
    caloriesRemainingKcal: number | null;
    proteinPriority: boolean;
    caloriePriority: boolean;
    macroBalanceMode: boolean;
    maxResults?: number;
  }
): SavedMealMatch[] {
  if (!meals?.length) return [];

  const {
    proteinRemainingG,
    caloriesRemainingKcal,
    proteinPriority,
    caloriePriority,
    macroBalanceMode,
    maxResults = 3,
  } = options;

  const scored = meals.map((meal) => {
    const m = meal.macros.perServing;
    let fitScore = 0;
    const reasons: string[] = [];

    if (proteinPriority && proteinRemainingG != null && proteinRemainingG > PROTEIN_DONE_G) {
      const proteinFit = Math.min(m.proteinG / Math.max(proteinRemainingG, 1), 1);
      fitScore += proteinFit * 0.55;
      if (m.proteinG >= Math.min(proteinRemainingG, 40)) {
        reasons.push(`${Math.round(m.proteinG)} g Protein`);
      }
    }

    if (caloriePriority && caloriesRemainingKcal != null && caloriesRemainingKcal > 150) {
      const ideal = Math.min(caloriesRemainingKcal * 0.45, caloriesRemainingKcal);
      const calDiff = Math.abs(m.calories - ideal);
      const calFit = Math.max(0, 1 - calDiff / Math.max(ideal, 200));
      fitScore += calFit * 0.35;
      reasons.push(`${Math.round(m.calories)} kcal`);
    }

    if (macroBalanceMode) {
      const calFit =
        caloriesRemainingKcal != null && caloriesRemainingKcal > 0
          ? Math.max(0, 1 - Math.abs(m.calories - caloriesRemainingKcal * 0.35) / caloriesRemainingKcal)
          : 0.3;
      fitScore += calFit * 0.5;
      reasons.push("Makro-Balance");
    }

    if (!proteinPriority && !caloriePriority && !macroBalanceMode) {
      fitScore = 0.2;
    }

    const remainingAfter = {
      proteinG:
        proteinRemainingG != null
          ? Math.max(0, Math.round(proteinRemainingG - m.proteinG))
          : null,
      calories:
        caloriesRemainingKcal != null
          ? Math.max(0, Math.round(caloriesRemainingKcal - m.calories))
          : null,
    };

    return {
      meal,
      fitScore: Math.round(fitScore * 100) / 100,
      reason: reasons.length ? reasons.join(", ") : `${Math.round(m.proteinG)} g Protein, ${Math.round(m.calories)} kcal`,
      remainingAfter,
    };
  });

  return scored
    .filter((s) => s.fitScore > 0.15)
    .sort((a, b) => b.fitScore - a.fitScore)
    .slice(0, maxResults);
}

export function confidenceFromData(options: {
  hasTargets: boolean;
  hasMeals: boolean;
  hasRemaining: boolean;
}): NutritionPerformanceConfidence {
  if (!options.hasTargets) return "low";
  if (options.hasTargets && options.hasRemaining) {
    return options.hasMeals ? "high" : "medium";
  }
  return "medium";
}

export function goalGuidance(
  nutritionGoal: string | null
): { restrictCalories: boolean; prioritizeProtein: boolean } {
  switch (nutritionGoal) {
    case "FAT_LOSS":
      return { restrictCalories: true, prioritizeProtein: true };
    case "MUSCLE_GAIN":
      return { restrictCalories: false, prioritizeProtein: true };
    default:
      return { restrictCalories: false, prioritizeProtein: false };
  }
}

export { PROTEIN_DONE_G, PROTEIN_WARN_G, CALORIES_WARN_KCAL };
