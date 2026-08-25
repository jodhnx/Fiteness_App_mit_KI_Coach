import { getCached, setCached, invalidateCache } from "@/lib/client-cache";

export type SavedMealSummary = {
  id: string;
  name: string;
  servings: number;
  isMealTemplate: boolean;
  ingredients: { foodItemId: string; name: string; quantityG: number }[];
  macros: {
    perServing: {
      calories: number;
      proteinG: number;
      carbsG: number;
      fatG: number;
    };
    total: {
      calories: number;
      proteinG: number;
      carbsG: number;
      fatG: number;
    };
  };
};

export const SAVED_MEALS_CACHE_KEY = "nexform:saved-meals-v1";
const TTL = 10 * 60_000;

export function getCachedSavedMeals(): SavedMealSummary[] | null {
  return getCached<SavedMealSummary[]>(SAVED_MEALS_CACHE_KEY, { allowStale: true });
}

export function setCachedSavedMeals(meals: SavedMealSummary[]) {
  setCached(SAVED_MEALS_CACHE_KEY, meals, TTL);
}

export function invalidateSavedMealsCache() {
  invalidateCache(SAVED_MEALS_CACHE_KEY);
}

/** Load meal templates for the signed-in user (server filters by ownership). */
export async function fetchSavedMealTemplates(force = false): Promise<SavedMealSummary[]> {
  if (!force) {
    const cached = getCached<SavedMealSummary[]>(SAVED_MEALS_CACHE_KEY);
    if (cached) return cached;
  }

  const res = await fetch("/api/nutrition/recipes", { credentials: "include" });
  if (!res.ok) {
    return getCachedSavedMeals() ?? [];
  }
  const data = (await res.json()) as {
    recipes?: (SavedMealSummary & { isMealTemplate?: boolean })[];
  };
  const meals = (data.recipes ?? []).filter((r) => r.isMealTemplate);
  setCachedSavedMeals(meals);
  return meals;
}

export function filterSavedMeals(
  meals: SavedMealSummary[],
  query: string
): SavedMealSummary[] {
  const q = query.trim().toLowerCase();
  if (!q) return meals;
  return meals.filter((m) => {
    if (m.name.toLowerCase().includes(q)) return true;
    return m.ingredients.some((i) => i.name.toLowerCase().includes(q));
  });
}
