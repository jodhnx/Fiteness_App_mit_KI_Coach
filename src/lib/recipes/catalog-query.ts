/**
 * Server-side recipe catalog query — pagination + filters.
 * Catalog stays in TS modules (not shipped wholesale to the client).
 */

import {
  FITNESS_RECIPES,
  recipeTotalMinutes,
  type FitnessRecipe,
  type RecipeMealSlot,
  type RecipeTag,
} from "@/data/recipes";

export type RecipeListItem = Pick<
  FitnessRecipe,
  | "id"
  | "name"
  | "mealSlot"
  | "tags"
  | "prepMinutes"
  | "cookMinutes"
  | "calories"
  | "proteinG"
  | "carbsG"
  | "fatG"
  | "fiberG"
  | "emoji"
  | "accent"
  | "imageUrl"
  | "difficulty"
  | "servings"
>;

export type CatalogQuery = {
  q?: string;
  filters?: string[];
  page?: number;
  limit?: number;
};

function toListItem(r: FitnessRecipe): RecipeListItem {
  return {
    id: r.id,
    name: r.name,
    mealSlot: r.mealSlot,
    tags: r.tags,
    prepMinutes: r.prepMinutes,
    cookMinutes: r.cookMinutes,
    calories: r.calories,
    proteinG: r.proteinG,
    carbsG: r.carbsG,
    fatG: r.fatG,
    fiberG: r.fiberG,
    emoji: r.emoji,
    accent: r.accent,
    imageUrl: r.imageUrl,
    difficulty: r.difficulty,
    servings: r.servings,
  };
}

function matchesFilters(r: FitnessRecipe, filters: string[]): boolean {
  if (filters.length === 0) return true;
  return filters.every((f) => {
    if (f === "BREAKFAST" || f === "LUNCH" || f === "DINNER" || f === "SNACK") {
      return r.mealSlot === (f as RecipeMealSlot);
    }
    if (f === "under-500") return r.calories < 500;
    if (f === "under-30") return recipeTotalMinutes(r) < 30;
    return r.tags.includes(f as RecipeTag);
  });
}

export function queryRecipeCatalog(input: CatalogQuery): {
  recipes: RecipeListItem[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
} {
  const q = (input.q ?? "").trim().toLowerCase();
  const filters = input.filters ?? [];
  const page = Math.max(1, input.page ?? 1);
  const limit = Math.min(48, Math.max(1, input.limit ?? 24));

  const filtered = FITNESS_RECIPES.filter((r) => {
    if (q) {
      const hay =
        `${r.name} ${r.description} ${r.ingredients.map((i) => i.name).join(" ")} ${r.tags.join(" ")}`.toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return matchesFilters(r, filters);
  });

  const total = filtered.length;
  const start = (page - 1) * limit;
  const recipes = filtered.slice(start, start + limit).map(toListItem);

  return {
    recipes,
    total,
    page,
    limit,
    hasMore: start + recipes.length < total,
  };
}

export function getCatalogRecipeDetail(id: string): FitnessRecipe | undefined {
  return FITNESS_RECIPES.find((r) => r.id === id);
}

export function getCatalogStats() {
  return {
    total: FITNESS_RECIPES.length,
    bySlot: {
      BREAKFAST: FITNESS_RECIPES.filter((r) => r.mealSlot === "BREAKFAST").length,
      LUNCH: FITNESS_RECIPES.filter((r) => r.mealSlot === "LUNCH").length,
      DINNER: FITNESS_RECIPES.filter((r) => r.mealSlot === "DINNER").length,
      SNACK: FITNESS_RECIPES.filter((r) => r.mealSlot === "SNACK").length,
    },
  };
}
