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
let savedMealsInflight: Promise<SavedMealSummary[]> | null = null;

export function getCachedSavedMeals(): SavedMealSummary[] | null {
  return getCached<SavedMealSummary[]>(SAVED_MEALS_CACHE_KEY, { allowStale: true });
}

export function setCachedSavedMeals(meals: SavedMealSummary[]) {
  setCached(SAVED_MEALS_CACHE_KEY, meals, TTL);
}

export function invalidateSavedMealsCache() {
  invalidateCache(SAVED_MEALS_CACHE_KEY);
}

async function loadSavedMealTemplatesFromNetwork(): Promise<SavedMealSummary[]> {
  if (savedMealsInflight) return savedMealsInflight;
  savedMealsInflight = (async () => {
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
  })().finally(() => {
    savedMealsInflight = null;
  });
  return savedMealsInflight;
}

/** Load meal templates for the signed-in user (server filters by ownership). */
export async function fetchSavedMealTemplates(force = false): Promise<SavedMealSummary[]> {
  if (!force) {
    const fresh = getCached<SavedMealSummary[]>(SAVED_MEALS_CACHE_KEY);
    if (fresh) return fresh;
    const soft = getCachedSavedMeals();
    if (soft) {
      void loadSavedMealTemplatesFromNetwork();
      return soft;
    }
  }

  return loadSavedMealTemplatesFromNetwork();
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
