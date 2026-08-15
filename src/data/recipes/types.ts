/** Recipe catalog types + filters — local first, external sources pluggable. */

export type RecipeMealSlot = "BREAKFAST" | "LUNCH" | "DINNER" | "SNACK";

export type RecipeTag =
  | "high-protein"
  | "low-calorie"
  | "muscle-gain"
  | "fat-loss"
  | "quick"
  | "vegetarian";

export type RecipeDifficulty = "easy" | "medium" | "hard";

export type RecipeIngredient = {
  name: string;
  amount: string;
  grams?: number;
};

export type RecipeSourceMeta = {
  name: string;
  url?: string;
};

export type FitnessRecipe = {
  id: string;
  name: string;
  mealSlot: RecipeMealSlot;
  tags: RecipeTag[];
  prepMinutes: number;
  servings: number;
  difficulty: RecipeDifficulty;
  calories: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  fiberG?: number;
  emoji: string;
  accent: string;
  imageUrl?: string;
  ingredients: RecipeIngredient[];
  steps: string[];
  description: string;
  /** Attribution when recipe comes from an external allowed source */
  source?: RecipeSourceMeta;
};

export const RECIPE_FILTERS: { id: string; label: string }[] = [
  { id: "BREAKFAST", label: "Frühstück" },
  { id: "LUNCH", label: "Mittagessen" },
  { id: "DINNER", label: "Abendessen" },
  { id: "SNACK", label: "Snacks" },
  { id: "high-protein", label: "High Protein" },
  { id: "low-calorie", label: "Low Calorie" },
  { id: "muscle-gain", label: "Muskelaufbau" },
  { id: "fat-loss", label: "Abnehmen" },
  { id: "quick", label: "Schnell" },
  { id: "vegetarian", label: "Vegetarisch" },
  { id: "under-500", label: "Unter 500 kcal" },
  { id: "under-30", label: "Unter 30 Min" },
];

export function recipeServingGrams(recipe: FitnessRecipe): number {
  const sum = recipe.ingredients.reduce((s, i) => s + (i.grams ?? 0), 0);
  return sum > 0 ? sum : 100;
}

export function recipeMacrosPer100g(recipe: FitnessRecipe) {
  const g = recipeServingGrams(recipe);
  const factor = 100 / g;
  return {
    calories: Math.round(recipe.calories * factor * 10) / 10,
    proteinG: Math.round(recipe.proteinG * factor * 10) / 10,
    carbsG: Math.round(recipe.carbsG * factor * 10) / 10,
    fatG: Math.round(recipe.fatG * factor * 10) / 10,
    fiberG: recipe.fiberG != null ? Math.round(recipe.fiberG * factor * 10) / 10 : null,
    servingG: g,
  };
}

type Draft = Omit<FitnessRecipe, "servings" | "difficulty" | "tags"> & {
  tags?: RecipeTag[];
  servings?: number;
  difficulty?: RecipeDifficulty;
};

/** Factory keeps catalog entries concise and consistent. */
export function R(draft: Draft): FitnessRecipe {
  const tags = [...(draft.tags ?? [])];
  if (draft.prepMinutes <= 20 && !tags.includes("quick")) tags.push("quick");
  if (draft.calories <= 350 && !tags.includes("low-calorie")) tags.push("low-calorie");
  if (draft.proteinG >= 35 && !tags.includes("high-protein")) tags.push("high-protein");
  const { tags: _t, servings, difficulty, ...rest } = draft;
  void _t;
  return {
    ...rest,
    servings: servings ?? 1,
    difficulty: difficulty ?? "easy",
    tags,
  };
}
