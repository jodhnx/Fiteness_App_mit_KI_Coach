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
import { searchDachRetailFoods } from "@/data/dach-retail-foods";
import {
  normalizeFoodCountry,
  type FoodCountryCode,
  RETAILERS_BY_COUNTRY,
} from "@/lib/food/food-region";
import { expandFoodSearchTerms } from "@/lib/food/food-synonyms";
import { prisma } from "@/lib/prisma";

const searchCache = new Map<string, { at: number; data: FoodSearchResponse }>();
const SEARCH_CACHE_MS = 120_000;

async function resolveUserCountry(userId: string): Promise<FoodCountryCode> {
  try {
    const row = await prisma.profile.findUnique({
      where: { userId },
      select: { countryCode: true },
    });
    return normalizeFoodCountry(
      (row as { countryCode?: string | null } | null)?.countryCode
    );
  } catch {
    return "AT";
  }
}

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

function scoreProduct(
  p: FoodProduct,
  query: string,
  country: FoodCountryCode
): number {
  const q = query.toLowerCase();
  let score = nameMatchBonus(p, q);
  if (p.source === "local") score += 45;
  if (p.brand === "Standardgericht" || p.brand === "Standardlebensmittel") {
    score += 55;
  }

  const preferred = RETAILERS_BY_COUNTRY[country];
  const brandL = (p.brand ?? "").toLowerCase();
  if (preferred.some((r) => brandL.includes(r.toLowerCase()))) {
    score += 70;
  } else if (
    [
      "mcdonald's",
      "burger king",
      "kfc",
      "subway",
      "domino's",
      "pizza hut",
      "restaurant",
      "selbstgemacht",
    ].some((b) => brandL.includes(b))
  ) {
    score += 50;
  }

  const offScore = p.austriaScore ?? 0;
  score += country === "AT" ? offScore : Math.round(offScore * 0.85);
  return score;
}

function mergeAndRank(
  local: FoodProduct[],
  standard: FoodProduct[],
  catalog: FoodProduct[],
  brands: FoodProduct[],
  retail: FoodProduct[],
  off: FoodProduct[],
  query: string,
  country: FoodCountryCode
): FoodProduct[] {
  const offCodes = new Set(local.filter((l) => l.offCode).map((l) => l.offCode!));
  const offFiltered = filterNonDachProducts(
    off.filter((o) => !o.offCode || !offCodes.has(o.offCode))
  );
  const merged = dedupeProducts([
    ...brands,
    ...retail,
    ...standard,
    ...catalog,
    ...local,
    ...offFiltered,
  ]);
  return [...merged]
    .sort(
      (a, b) =>
        scoreProduct(b, query, country) - scoreProduct(a, query, country)
    )
    .slice(0, 45);
}

async function searchLocalWithSynonyms(
  userId: string,
  query: string,
  country: FoodCountryCode,
  limit: number
): Promise<FoodProduct[]> {
  const terms = expandFoodSearchTerms(query, country);
  const batches = await Promise.all(
    terms.slice(0, 4).map((t) =>
      searchLocalFoods(userId, t, Math.ceil(limit / 2)).catch(
        () => [] as FoodProduct[]
      )
    )
  );
  return dedupeProducts(batches.flat()).slice(0, limit);
}

function searchStaticLayers(query: string, country: FoodCountryCode) {
  const terms = expandFoodSearchTerms(query, country);
  const standard = dedupeProducts(
    terms.flatMap((t) => searchStandardDishes(t, 10))
  ).slice(0, 16);
  const catalog = dedupeProducts(
    terms.flatMap((t) => searchFoodCatalog(t, 12))
  ).slice(0, 20);
  const brands = dedupeProducts(
    terms.flatMap((t) => searchBrandRestaurantFoods(t, 12))
  ).slice(0, 20);
  const retail = dedupeProducts(
    terms.flatMap((t) => searchDachRetailFoods(t, 16, country))
  ).slice(0, 24);
  return { standard, catalog, brands, retail };
}

export async function searchFoodProductsLocalOnly(
  userId: string,
  query: string,
  country?: FoodCountryCode
): Promise<FoodSearchResponse> {
  const q = query.trim();
  const countryCode = country ?? (await resolveUserCountry(userId));
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

  const [localResult, layers] = await Promise.all([
    searchLocalWithSynonyms(userId, q, countryCode, 24),
    Promise.resolve(searchStaticLayers(q, countryCode)),
  ]);

  const products = mergeAndRank(
    localResult,
    layers.standard,
    layers.catalog,
    layers.brands,
    layers.retail,
    [],
    q,
    countryCode
  );

  return {
    products,
    suggestions: [],
    query: q,
    source: "local",
    offAvailable: true,
    localCount: products.length,
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
    countryCode?: FoodCountryCode;
  }
): Promise<FoodSearchResponse> {
  const q = query.trim();
  const countryCode =
    options?.countryCode ?? (await resolveUserCountry(userId));

  if (options?.localOnly) {
    return searchFoodProductsLocalOnly(userId, q, countryCode);
  }

  const cacheKey = `${userId}:${countryCode}:${q.toLowerCase()}`;
  const hit = searchCache.get(cacheKey);
  if (q.length >= 2 && hit && Date.now() - hit.at < SEARCH_CACHE_MS) {
    return hit.data;
  }

  if (q.length < 2) {
    const recent = await getRecentSearchQueries(userId).catch(
      () => [] as string[]
    );
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

  const layers = searchStaticLayers(q, countryCode);
  let localError: string | null = null;
  const primaryOffQuery = expandFoodSearchTerms(q, countryCode)[0] ?? q;

  // Local DB first — never block the response on Open Food Facts
  const localSettled = await searchLocalWithSynonyms(userId, q, countryCode, 28).catch(
    (e) => {
      localError = e instanceof Error ? e.message : "Lokale DB Fehler";
      return [] as FoodProduct[];
    }
  );

  // Cap OFF wait so search stays snappy (local already painted)
  const offResult = await Promise.race([
    searchOpenFoodFacts(primaryOffQuery, 32, countryCode),
    new Promise<{
      products: FoodProduct[];
      error?: string;
      source?: string | null;
    }>((resolve) =>
      setTimeout(
        () =>
          resolve({
            products: [],
            error: undefined,
            source: null,
          }),
        1800
      )
    ),
  ]);

  const products = mergeAndRank(
    localSettled,
    layers.standard,
    layers.catalog,
    layers.brands,
    layers.retail,
    offResult.products,
    q,
    countryCode
  );
  const recent = await getRecentSearchQueries(userId, 5).catch(
    () => [] as string[]
  );

  const offAvailable = !offResult.error && offResult.products.length > 0;
  const hasLocal = products.length > 0;

  let offError: string | null = offResult.error ?? null;
  if (!offAvailable && !hasLocal) {
    offError =
      offResult.error ??
      "Keine Produkte gefunden. Prüfe die Schreibweise oder versuche ein Standardgericht.";
  } else if (!offAvailable && offResult.error && hasLocal) {
    offError = null;
  }

  const response: FoodSearchResponse = {
    products,
    suggestions: recent
      .filter((s) => s.toLowerCase() !== q.toLowerCase())
      .slice(0, 6),
    query: q,
    source:
      offResult.products.length > 0
        ? "merged"
        : hasLocal
          ? "local"
          : "openfoodfacts",
    offAvailable: offAvailable || hasLocal,
    offError,
    localCount:
      localSettled.length + layers.standard.length + layers.retail.length,
    offCount: offResult.products.length,
    offSource: offResult.source ?? null,
    localError,
  };

  searchCache.set(cacheKey, { at: Date.now(), data: response });
  if (searchCache.size > 300) {
    const oldest = [...searchCache.entries()].sort(
      (a, b) => a[1].at - b[1].at
    )[0];
    if (oldest) searchCache.delete(oldest[0]);
  }

  return response;
}
