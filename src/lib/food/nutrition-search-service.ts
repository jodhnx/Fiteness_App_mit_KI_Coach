import type { FoodProduct, FoodSearchResponse } from "@/lib/food/food-product-types";

const searchCache = new Map<string, { at: number; data: FoodSearchResponse }>();
const SEARCH_CACHE_MS = 60_000;
import {
  searchOpenFoodFacts,
  suggestOpenFoodFacts,
  rankOffProducts,
} from "@/lib/food/open-food-facts-client";
import {
  searchLocalFoods,
  getRecentSearchQueries,
  recordSearchQuery,
} from "@/lib/food/food-database-service";

function dedupeProducts(products: FoodProduct[]): FoodProduct[] {
  const seen = new Set<string>();
  const out: FoodProduct[] = [];
  for (const p of products) {
    const key = p.offCode ?? p.id ?? `${p.name}-${p.brand}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(p);
  }
  return out;
}

function mergeAndRank(
  local: FoodProduct[],
  off: FoodProduct[],
  query: string
): FoodProduct[] {
  const offCodes = new Set(
    local.filter((l) => l.offCode).map((l) => l.offCode!)
  );
  const offFiltered = off.filter((o) => !o.offCode || !offCodes.has(o.offCode));
  const merged = dedupeProducts([...local, ...offFiltered]);
  return rankOffProducts(merged, query).slice(0, 45);
}

export async function searchFoodProducts(
  userId: string,
  query: string,
  options?: { suggestions?: boolean; recordHistory?: boolean }
): Promise<FoodSearchResponse> {
  const q = query.trim();
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

  let localResult: FoodProduct[] = [];
  let localError: string | null = null;
  const [localSettled, offResult] = await Promise.all([
    searchLocalFoods(userId, q, 28).catch((e) => {
      localError = e instanceof Error ? e.message : "Lokale DB Fehler";
      console.error("[nutrition-search] local DB", e);
      return [] as FoodProduct[];
    }),
    searchOpenFoodFacts(q, 40),
  ]);
  localResult = localSettled;

  let offSuggestions: string[] = [];
  if (options?.suggestions) {
    try {
      offSuggestions = await suggestOpenFoodFacts(q);
    } catch {
      offSuggestions = [];
    }
  }

  const products = mergeAndRank(localResult, offResult.products, q);
  const recent = await getRecentSearchQueries(userId, 5).catch(() => [] as string[]);
  const suggestions = dedupeSuggestions([...offSuggestions, ...recent], q);

  const offAvailable = !offResult.error && offResult.products.length > 0;
  const hasLocal = localResult.length > 0;
  const hasAny = products.length > 0;

  let offError: string | null = offResult.error ?? null;
  if (!offAvailable && !hasAny && !hasLocal) {
    offError =
      offResult.error ??
      "Keine Produkte gefunden. Prüfe die Schreibweise oder versuche einen Markennamen (z. B. Clever, Red Bull).";
  } else if (!offAvailable && offResult.error && hasLocal) {
    offError = `${offResult.error} — nur lokale Treffer werden angezeigt.`;
  }

  const response: FoodSearchResponse = {
    products,
    suggestions,
    query: q,
    source:
      offResult.products.length > 0
        ? "merged"
        : hasLocal
          ? "local"
          : "openfoodfacts",
    offAvailable: offAvailable || hasAny,
    offError,
    localCount: localResult.length,
    offCount: offResult.products.length,
    offSource: offResult.source ?? null,
    localError,
  };

  if (q.length >= 2) {
    searchCache.set(cacheKey, { at: Date.now(), data: response });
    if (searchCache.size > 200) {
      const oldest = [...searchCache.entries()].sort((a, b) => a[1].at - b[1].at)[0];
      if (oldest) searchCache.delete(oldest[0]);
    }
  }

  return response;
}

function dedupeSuggestions(items: string[], query: string): string[] {
  const q = query.toLowerCase();
  const seen = new Set<string>();
  const out: string[] = [];
  for (const s of items) {
    const t = s.trim();
    if (!t || seen.has(t.toLowerCase())) continue;
    seen.add(t.toLowerCase());
    if (t.toLowerCase() !== q) out.push(t);
    if (out.length >= 8) break;
  }
  return out;
}
