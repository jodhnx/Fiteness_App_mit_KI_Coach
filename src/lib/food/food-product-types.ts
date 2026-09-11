export type FoodProductSource = "local" | "openfoodfacts";

export type ExtendedNutrientsPer100g = {
  sugarG?: number | null;
  fiberG?: number | null;
  saltG?: number | null;
  saturatedFatG?: number | null;
  unsaturatedFatG?: number | null;
  potassiumMg?: number | null;
  magnesiumMg?: number | null;
  calciumMg?: number | null;
};

export type FoodProduct = {
  id?: string;
  offCode?: string;
  barcode?: string | null;
  name: string;
  brand: string | null;
  calories: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  fiberG: number | null;
  /** Per 100g — sugars, salt, minerals (when available) */
  extended?: ExtendedNutrientsPer100g | null;
  servingG: number;
  servingLabel?: string | null;
  imageUrl?: string | null;
  category?: string;
  source: FoodProductSource;
  countries?: string[];
  austriaScore?: number;
};

export type FoodSearchResponse = {
  products: FoodProduct[];
  suggestions: string[];
  query: string;
  source: "merged" | "local" | "openfoodfacts";
  offAvailable: boolean;
  offError?: string | null;
  localCount?: number;
  offCount?: number;
  offSource?: string | null;
  localError?: string | null;
};

export function foodSearchUrl(
  query: string,
  phase: "fast" | "enrich" | "full"
): string {
  const extra =
    phase === "enrich" ? "enrich=1" : phase === "fast" ? "fast=1" : "full=1";
  // Country hint skips Profile lookup on the hot path.
  return `/api/food/search?q=${encodeURIComponent(query)}&${extra}&country=AT`;
}

export function mergeFoodSearchResponses(
  base: FoodSearchResponse,
  extra: FoodSearchResponse
): FoodSearchResponse {
  const seen = new Set<string>();
  const products: FoodProduct[] = [];
  for (const p of [...(base.products ?? []), ...(extra.products ?? [])]) {
    const key = (p.offCode ?? p.id ?? `${p.name}-${p.brand ?? ""}`).toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    products.push(p);
  }
  const offCount = extra.offCount ?? extra.products?.length ?? 0;
  return {
    ...base,
    ...extra,
    products: products.slice(0, 45),
    query: base.query || extra.query,
    source: offCount > 0 && (base.products?.length ?? 0) > 0 ? "merged" : extra.source ?? base.source,
    offAvailable: Boolean(base.offAvailable || extra.offAvailable),
    offError: extra.offError ?? base.offError ?? null,
    localCount: base.localCount ?? base.products?.length ?? 0,
    offCount,
    offSource: extra.offSource ?? base.offSource ?? null,
    suggestions: extra.suggestions?.length ? extra.suggestions : base.suggestions,
  };
}
