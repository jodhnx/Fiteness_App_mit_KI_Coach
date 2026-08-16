/**
 * Client-side recipe catalog cache — list stays warm across detail navigation.
 */

import { getCached, setCached } from "@/lib/client-cache";
import type { RecipeListItem } from "@/lib/recipes/catalog-query";

export const RECIPE_LIST_CACHE_KEY = "recipe-catalog-list";
export const RECIPE_FAV_CACHE_KEY = "recipe-catalog-favorites";
export const RECIPE_UI_STATE_KEY = "recipe-catalog-ui";

export type RecipeCatalogCache = {
  recipes: RecipeListItem[];
  total: number;
  catalogTotal: number;
  page: number;
  hasMore: boolean;
  favoriteIds: string[];
  q: string;
  filters: string[];
  fetchedAt: number;
};

export type RecipeUiState = {
  query: string;
  filters: string[];
  scrollY?: number;
};

export function recipeListCacheKey(q: string, filters: string[]): string {
  const f = [...filters].sort().join(",");
  return `${RECIPE_LIST_CACHE_KEY}:${q.trim().toLowerCase()}|${f}`;
}

export function readRecipeCatalogCache(
  q: string,
  filters: string[]
): RecipeCatalogCache | null {
  return getCached<RecipeCatalogCache>(recipeListCacheKey(q, filters), {
    allowStale: true,
  });
}

export function writeRecipeCatalogCache(
  data: Omit<RecipeCatalogCache, "fetchedAt">,
  ttlMs = 600_000
) {
  const payload: RecipeCatalogCache = { ...data, fetchedAt: Date.now() };
  setCached(recipeListCacheKey(data.q, data.filters), payload, ttlMs);
  setCached(RECIPE_FAV_CACHE_KEY, data.favoriteIds, 180_000);
  // Default browse key for boot warmer
  if (!data.q && data.filters.length === 0) {
    setCached(RECIPE_LIST_CACHE_KEY, payload, ttlMs);
  }
}

export function readDefaultRecipeCatalog(): RecipeCatalogCache | null {
  return (
    getCached<RecipeCatalogCache>(recipeListCacheKey("", []), {
      allowStale: true,
    }) ??
    getCached<RecipeCatalogCache>(RECIPE_LIST_CACHE_KEY, { allowStale: true })
  );
}

export function patchRecipeFavoriteIds(ids: string[]) {
  setCached(RECIPE_FAV_CACHE_KEY, ids, 180_000);
  const def = readDefaultRecipeCatalog();
  if (def) {
    writeRecipeCatalogCache({ ...def, favoriteIds: ids });
  }
}

export function readRecipeUiState(): RecipeUiState | null {
  return getCached<RecipeUiState>(RECIPE_UI_STATE_KEY, { allowStale: true });
}

export function writeRecipeUiState(state: RecipeUiState) {
  setCached(RECIPE_UI_STATE_KEY, state, 600_000);
}
