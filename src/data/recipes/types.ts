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
  /** Optional section header when grouping (z. B. „Hähnchen“, „Sauce“) */
  group?: string;
};

export type RecipeVariation = {
  title: string;
  description: string;
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
  /** Active prep / chopping time */
  prepMinutes: number;
  /** Active cooking time (optional) */
  cookMinutes?: number;
  /** Rest / overnight / cooling (optional) */
  restMinutes?: number;
  ovenTempC?: number;
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
  /** Highlighted spices used in the dish */
  spices?: string[];
  steps: string[];
  tips?: string[];
  variations?: RecipeVariation[];
  storageNote?: string;
  mealPrepNote?: string;
  description: string;
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

export function recipeTotalMinutes(recipe: FitnessRecipe): number {
  return (
    (recipe.prepMinutes ?? 0) +
    (recipe.cookMinutes ?? 0) +
    (recipe.restMinutes ?? 0)
  );
}

export function recipeServingGrams(recipe: FitnessRecipe): number {
  const sum = recipe.ingredients.reduce((s, i) => s + (i.grams ?? 0), 0);
  return sum > 0 ? sum : 100;
}

export function groupRecipeIngredients(
  ingredients: RecipeIngredient[]
): { label: string; items: RecipeIngredient[] }[] {
  const order: string[] = [];
  const map = new Map<string, RecipeIngredient[]>();
  for (const item of ingredients) {
    const key = item.group?.trim() || "Zutaten";
    if (!map.has(key)) {
      map.set(key, []);
      order.push(key);
    }
    map.get(key)!.push(item);
  }
  return order.map((label) => ({ label, items: map.get(label)! }));
}

export function recipeMacrosPer100g(recipe: FitnessRecipe) {
  const g = recipeServingGrams(recipe);
  const factor = 100 / g;
  return {
    calories: Math.round(recipe.calories * factor * 10) / 10,
    proteinG: Math.round(recipe.proteinG * factor * 10) / 10,
    carbsG: Math.round(recipe.carbsG * factor * 10) / 10,
    fatG: Math.round(recipe.fatG * factor * 10) / 10,
    fiberG:
      recipe.fiberG != null ? Math.round(recipe.fiberG * factor * 10) / 10 : null,
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
  const total =
    (draft.prepMinutes ?? 0) + (draft.cookMinutes ?? 0);
  if (total > 0 && total <= 20 && !tags.includes("quick")) tags.push("quick");
  if (draft.calories <= 350 && !tags.includes("low-calorie")) {
    tags.push("low-calorie");
  }
  if (draft.proteinG >= 35 && !tags.includes("high-protein")) {
    tags.push("high-protein");
  }
  const { tags: _t, servings, difficulty, ...rest } = draft;
  void _t;
  return {
    ...rest,
    servings: servings ?? 1,
    difficulty: difficulty ?? "easy",
    tags,
  };
}
