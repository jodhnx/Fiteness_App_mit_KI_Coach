/**
 * Recipe catalog entry — local NEXFORM DB + pluggable external sources.
 */

import type { FitnessRecipe } from "./types";
import { BREAKFAST_RECIPES } from "./breakfast";
import { LUNCH_RECIPES } from "./lunch";
import { DINNER_RECIPES } from "./dinner";
import { SNACK_RECIPES } from "./snacks";
import { EXTRA_RECIPES } from "./extra";
import { resolveRecipeImageUrl } from "./images";

export * from "./types";
export { resolveRecipeImageUrl, RECIPE_IMAGE_BY_ID } from "./images";

function withImages(list: FitnessRecipe[]): FitnessRecipe[] {
  return list.map((r) => ({
    ...r,
    imageUrl: resolveRecipeImageUrl(r.id, r.imageUrl) ?? undefined,
  }));
}

export const FITNESS_RECIPES: FitnessRecipe[] = withImages([
  ...BREAKFAST_RECIPES,
  ...LUNCH_RECIPES,
  ...DINNER_RECIPES,
  ...SNACK_RECIPES,
  ...EXTRA_RECIPES,
]);

const byId = new Map(FITNESS_RECIPES.map((r) => [r.id, r]));

export function getFitnessRecipe(id: string): FitnessRecipe | undefined {
  return byId.get(id);
}

export function searchFitnessRecipes(
  query: string,
  filters: string[]
): FitnessRecipe[] {
  const q = query.trim().toLowerCase();
  return FITNESS_RECIPES.filter((r) => {
    if (q) {
      const hay =
        `${r.name} ${r.description} ${r.ingredients.map((i) => i.name).join(" ")}`.toLowerCase();
      if (!hay.includes(q)) return false;
    }
    if (filters.length === 0) return true;
    return filters.every((f) => {
      if (f === "BREAKFAST" || f === "LUNCH" || f === "DINNER" || f === "SNACK") {
        return r.mealSlot === f;
      }
      if (f === "under-500") return r.calories < 500;
      if (f === "under-30") return r.prepMinutes < 30;
      return r.tags.includes(f as FitnessRecipe["tags"][number]);
    });
  });
}
