/**
 * Pluggable recipe sources.
 * Today: local catalog. Later: licensed APIs (e.g. Spoonacular) with attribution.
 */

import {
  FITNESS_RECIPES,
  getFitnessRecipe,
  searchFitnessRecipes,
  type FitnessRecipe,
} from "@/data/recipes";

export type RecipeProviderId = "local" | "external";

export interface RecipeProvider {
  id: RecipeProviderId;
  /** Human-readable label for UI / legal */
  label: string;
  list(): Promise<FitnessRecipe[]>;
  get(id: string): Promise<FitnessRecipe | undefined>;
  search(query: string, filters: string[]): Promise<FitnessRecipe[]>;
}

/** Primary offline-first catalog — no network, instant. */
export const localRecipeProvider: RecipeProvider = {
  id: "local",
  label: "NEXFORM Rezepte",
  async list() {
    return FITNESS_RECIPES;
  },
  async get(id) {
    return getFitnessRecipe(id);
  },
  async search(query, filters) {
    return searchFitnessRecipes(query, filters);
  },
};

/**
 * Placeholder for future external APIs.
 * Must only return recipes with `source` attribution and licensed use.
 * Not enabled by default — keeps startup fast and offline-capable.
 */
export const externalRecipeProvider: RecipeProvider = {
  id: "external",
  label: "Externe Quellen (bald)",
  async list() {
    return [];
  },
  async get() {
    return undefined;
  },
  async search() {
    return [];
  },
};

export async function loadAllRecipes(includeExternal = false): Promise<FitnessRecipe[]> {
  const local = await localRecipeProvider.list();
  if (!includeExternal) return local;
  const external = await externalRecipeProvider.list();
  const seen = new Set(local.map((r) => r.id));
  return [...local, ...external.filter((r) => !seen.has(r.id))];
}
