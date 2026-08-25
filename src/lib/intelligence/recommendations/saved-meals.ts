import { INTELLIGENCE_ACTIONS } from "@/lib/intelligence/actions";
import type { SavedMealSummary } from "@/lib/saved-meals-cache";
import type { AdaptiveRecommendation } from "@/lib/intelligence/recommendations/types";
import { findMatchingSavedMeals } from "@/lib/intelligence/nutrition-performance/analyze";

const MIN_PROTEIN_G = 25;

/** Find a saved meal that meaningfully contributes to daily protein target. */
export function findProteinRichSavedMeal(
  meals: SavedMealSummary[] | undefined,
  proteinTargetG: number | null | undefined
): SavedMealSummary | null {
  if (!meals?.length) return null;
  const threshold = Math.max(MIN_PROTEIN_G, (proteinTargetG ?? 120) * 0.25);
  const matches = findMatchingSavedMeals(meals, {
    proteinRemainingG: threshold,
    caloriesRemainingKcal: null,
    proteinPriority: true,
    caloriePriority: false,
    macroBalanceMode: false,
    maxResults: 1,
  });
  return matches[0]?.meal ?? null;
}

export { findMatchingSavedMeals } from "@/lib/intelligence/nutrition-performance/analyze";

export function buildSavedMealRecommendation(
  meal: SavedMealSummary,
  evidence: string[]
): AdaptiveRecommendation {
  return {
    id: "adapt-saved-meal-protein",
    type: "nutrition",
    priority: "secondary",
    title: "Gespeicherte Mahlzeit",
    explanation: `Eine deiner gespeicherten Mahlzeiten („${meal.name}“, ${Math.round(meal.macros.perServing.proteinG)} g Protein) passt gut zu deinem Proteinbedarf.`,
    evidence: [...evidence, `Mahlzeit „${meal.name}“: ${Math.round(meal.macros.perServing.proteinG)} g Protein pro Portion.`],
    action: INTELLIGENCE_ACTIONS.savedMeals,
    confidence: "medium",
    requiresConfirmation: false,
  };
}
