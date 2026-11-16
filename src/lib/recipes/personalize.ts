/**
 * Rank recipes against remaining daily nutrition targets.
 * Uses only provided remaining macros — never invents user data.
 */

import type { FitnessRecipe } from "@/data/recipes";

export type RemainingMacros = {
  calories?: number | null;
  proteinG?: number | null;
  carbsG?: number | null;
  fatG?: number | null;
  nutritionGoal?: string | null;
  excludeAllergens?: string[] | null;
};

function scoreRecipe(r: FitnessRecipe, rem: RemainingMacros): number {
  let score = 0;
  const cal = rem.calories;
  const p = rem.proteinG;
  const c = rem.carbsG;
  const f = rem.fatG;

  if (cal != null && cal > 0) {
    const ratio = r.calories / cal;
    if (ratio >= 0.55 && ratio <= 1.05) score += 40;
    else if (ratio >= 0.35 && ratio <= 1.2) score += 22;
    else if (r.calories > cal + 80) score -= 30;
    else score += 5;
  }

  if (p != null && p > 0) {
    if (r.proteinG >= Math.min(p, p * 0.7)) score += 35;
    else if (r.proteinG >= p * 0.4) score += 18;
    else score -= 5;
  }

  if (c != null && c > 0 && r.carbsG <= c + 15) score += 10;
  if (f != null && f > 0 && r.fatG <= f + 8) score += 8;

  const goal = (rem.nutritionGoal ?? "").toLowerCase();
  if (/cut|defizit|abnehm|fat.?loss/.test(goal)) {
    if (r.tags.includes("fat-loss") || r.tags.includes("low-calorie")) score += 12;
    if (r.calories > 650) score -= 10;
  }
  if (/bulk|aufbau|surplus|muscle/.test(goal)) {
    if (r.tags.includes("muscle-gain") || r.tags.includes("high-calorie")) score += 12;
    if (r.proteinG >= 35) score += 8;
  }

  if (r.tags.includes("high-protein")) score += 6;
  if (r.tags.includes("quick")) score += 3;
  if (r.tags.includes("meal-prep")) score += 2;

  const allergens = rem.excludeAllergens ?? [];
  if (allergens.length) {
    const hay = `${r.name} ${r.ingredients.map((i) => i.name).join(" ")}`.toLowerCase();
    for (const a of allergens) {
      const t = a.trim().toLowerCase();
      if (t && hay.includes(t)) score -= 80;
    }
  }

  return score;
}

export function rankRecipesForRemaining(
  recipes: FitnessRecipe[],
  remaining: RemainingMacros,
  limit = 12
): FitnessRecipe[] {
  return [...recipes]
    .map((r) => ({ r, s: scoreRecipe(r, remaining) }))
    .sort((a, b) => b.s - a.s)
    .slice(0, limit)
    .map((x) => x.r);
}
