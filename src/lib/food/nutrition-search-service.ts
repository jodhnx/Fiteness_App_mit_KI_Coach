import type { FoodProduct, FoodSearchResponse } from "@/lib/food/food-product-types";
import {
  searchOpenFoodFacts,
  filterNonDachProducts,
} from "@/lib/food/open-food-facts-client";
import {
  searchLocalFoods,
  getRecentSearchQueries,
  recordSearchQuery,
} from "@/lib/food/food-database-service";
import { searchStandardDishes } from "@/data/standard-dishes";
import { searchFoodCatalog } from "@/data/food-catalog";
import { searchBrandRestaurantFoods } from "@/data/brand-restaurant-foods";

const searchCache = new Map<string, { at: number; data: FoodSearchResponse }>();
const SEARCH_CACHE_MS = 120_000;

function dedupeProducts(products: FoodProduct[]): FoodProduct[] {
  const seen = new Set<string>();
  const out: FoodProduct[] = [];
  for (const p of products) {
    const key = (p.offCode ?? p.id ?? `${p.name}-${p.brand}`).toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(p);
  }
  return out;
}

function nameMatchBonus(p: FoodProduct, q: string): number {
  if (!q) return 0;
  const n = `${p.name} ${p.brand ?? ""}`.toLowerCase();
  if (n === q) return 40;
  if (n.startsWith(q)) return 28;
  if (n.includes(q)) return 14;
  return 0;
}

function scoreProduct(p: FoodProduct, query: string): number {
  const q = query.toLowerCase();
  let score = nameMatchBonus(p, q);
  if (p.source === "local") score += 45;
  if (p.brand === "Standardgericht" || p.brand === "Standardlebensmittel") score += 55;
  // Brand / Fast-Food variants rank high for brand queries
  if (
    p.brand &&
    ["McDonald's", "Burger King", "KFC", "Subway", "Domino's", "Pizza Hut", "Restaurant", "Selbstgemacht"].includes(
      p.brand
    )
  ) {
    score += 50;
    if (q.includes(p.brand.toLowerCase().split(" ")[0]!)) score += 30;
  }
  score += p.austriaScore ?? 0;
  return score;
}

function mergeAndRank(
  local: FoodProduct[],
  standard: FoodProduct[],
  catalog: FoodProduct[],
  brands: FoodProduct[],
  off: FoodProduct[],
  query: string
): FoodProduct[] {
  const offCodes = new Set(local.filter((l) => l.offCode).map((l) => l.offCode!));
  const offFiltered = filterNonDachProducts(
    off.filter((o) => !o.offCode || !offCodes.has(o.offCode))
  );
  const merged = dedupeProducts([
    ...brands,
    ...standard,
    ...catalog,
    ...local,
    ...offFiltered,
  ]);
  return [...merged]
    .sort((a, b) => scoreProduct(b, query) - scoreProduct(a, query))
    .slice(0, 45);
}

export async function searchFoodProductsLocalOnly(
  userId: string,
  query: string
): Promise<FoodSearchResponse> {
  const q = query.trim();
  if (q.length < 2) {
    return {
      products: [],
      suggestions: [],
      query: q,
      source: "local",
      offAvailable: true,
      localCount: 0,
      offCount: 0,
    };
  }

  const [localResult, standard, catalog, brands] = await Promise.all([
    searchLocalFoods(userId, q, 24).catch(() => [] as FoodProduct[]),
    Promise.resolve(searchStandardDishes(q, 16)),
    Promise.resolve(searchFoodCatalog(q, 20)),
    Promise.resolve(searchBrandRestaurantFoods(q, 20)),
  ]);

  const products = mergeAndRank(localResult, standard, catalog, brands, [], q);

  return {
    products,
    suggestions: [],
    query: q,
    source: "local",
    offAvailable: true,
    localCount: localResult.length + standard.length + catalog.length + brands.length,
    offCount: 0,
  };
}

export async function searchFoodProducts(
  userId: string,
  query: string,
  options?: {
    suggestions?: boolean;
    recordHistory?: boolean;
    localOnly?: boolean;
  }
): Promise<FoodSearchResponse> {
  const q = query.trim();

  if (options?.localOnly) {
    return searchFoodProductsLocalOnly(userId, q);
  }

  const cacheKey = `${userId}:${q.toLowerCase()}`;
  const hit = searchCache.get(cacheKey);
  if (q.length >= 2 && hit && Date.now() - hit.at < SEARCH_CACHE_MS) {
    return hit.data;
  }

  if (q.length < 2) {
    const recent = await getRecentSearchQueries(userId).catch(() => [] as string[]);
    return {
      products: [],
      suggestions: recent,
      query: q,
      source: "merged",
      offAvailable: true,
      localCount: 0,
      offCount: 0,
    };
  }

  if (options?.recordHistory !== false) {
    recordSearchQuery(userId, q).catch((e) =>
      console.error("[nutrition-search] recordSearchQuery", e)
    );
  }

  const standard = searchStandardDishes(q, 16);
  const catalog = searchFoodCatalog(q, 20);
  const brands = searchBrandRestaurantFoods(q, 20);

  let localResult: FoodProduct[] = [];
  let localError: string | null = null;

  const [localSettled, offResult] = await Promise.all([
    searchLocalFoods(userId, q, 28).catch((e) => {
      localError = e instanceof Error ? e.message : "Lokale DB Fehler";
      return [] as FoodProduct[];
    }),
    searchOpenFoodFacts(q, 32),
  ]);
  localResult = localSettled;

  const products = mergeAndRank(
    localResult,
    standard,
    catalog,
    brands,
    offResult.products,
    q
  );
  const recent = await getRecentSearchQueries(userId, 5).catch(() => [] as string[]);

  const offAvailable = !offResult.error && offResult.products.length > 0;
  const hasLocal =
    localResult.length > 0 ||
    standard.length > 0 ||
    catalog.length > 0 ||
    brands.length > 0;
  const hasAny = products.length > 0;

  let offError: string | null = offResult.error ?? null;
  if (!offAvailable && !hasAny && !hasLocal) {
    offError =
      offResult.error ??
      "Keine Produkte gefunden. Prüfe die Schreibweise oder versuche ein Standardgericht (z. B. Pizza, Döner).";
  } else if (!offAvailable && offResult.error && hasLocal) {
    offError = null;
  }

  const response: FoodSearchResponse = {
    products,
    suggestions: recent.filter((s) => s.toLowerCase() !== q.toLowerCase()).slice(0, 6),
    query: q,
    source: offResult.products.length > 0 ? "merged" : hasLocal ? "local" : "openfoodfacts",
    offAvailable: offAvailable || hasAny,
    offError,
    localCount: localResult.length + standard.length + catalog.length + brands.length,
    offCount: offResult.products.length,
    offSource: offResult.source ?? null,
    localError,
  };

  searchCache.set(cacheKey, { at: Date.now(), data: response });
  if (searchCache.size > 300) {
    const oldest = [...searchCache.entries()].sort((a, b) => a[1].at - b[1].at)[0];
    if (oldest) searchCache.delete(oldest[0]);
  }

  return response;
}
