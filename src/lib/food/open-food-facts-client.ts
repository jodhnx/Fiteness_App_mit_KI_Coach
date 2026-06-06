import type { FoodProduct } from "@/lib/food/food-product-types";
import { logOffRequest } from "@/lib/food/off-logger";

const OFF_USER_AGENT =
  "AI-Fitness-Coach-Pro/1.0 - Nutrition App - https://github.com - contact: nutrition@local.dev";

/** Primary: Search-a-licious (JSON, fast). Fallback: legacy CGI (often 503/HTML). */
const SEARCH_A_LICIOUS = "https://search.openfoodfacts.org/search";
const OFF_WORLD = "https://world.openfoodfacts.org";
const OFF_AT = "https://at.openfoodfacts.org";

const TIMEOUT_MS = 5000;
const MAX_RETRIES = 2;

const AT_BRAND_KEYWORDS = [
  "clever",
  "ja! natürlich",
  "ja! naturlich",
  "ja natürlich",
  "spar",
  "s-budget",
  "s budget",
  "hofer",
  "milfina",
  "milsani",
  "alnatura",
  "rauch",
  "red bull",
  "billa",
  "penny",
  "frischling",
  "ja!",
  "landessa",
  "fage",
  "mühlviertel",
  "muhlviertel",
  "dm",
  "müller",
  "mueller",
];

const DE_BRAND_KEYWORDS = [
  "rewe",
  "edeka",
  "lidl",
  "kaufland",
  "aldi",
  "netto",
  "real",
  "tegut",
  "norma",
  "ja!",
  "gut&günstig",
  "gut und guenstig",
  "milbona",
  "dulano",
  "k-take",
  "k classic",
  "ja! natürlich",
  "dm",
  "müller",
  "mueller",
  "alnatura",
  "bio",
];

type OffNutriments = Record<string, number | string | undefined>;

type OffProductRaw = {
  code?: string;
  _id?: string;
  product_name?: string;
  product_name_de?: string;
  product_name_en?: string;
  generic_name?: string;
  brands?: string | string[];
  brands_tags?: string[];
  quantity?: string;
  serving_size?: string;
  image_url?: string;
  image_front_small_url?: string;
  image_small_url?: string;
  countries_tags?: string[];
  origins_tags?: string[];
  nutriments?: OffNutriments;
  categories_tags?: string[];
};

type SearchALiciousResponse = {
  count?: number;
  hits?: OffProductRaw[];
};

function num(v: unknown): number {
  if (typeof v === "number" && !Number.isNaN(v)) return v;
  if (typeof v === "string") {
    const n = parseFloat(v.replace(",", "."));
    return Number.isNaN(n) ? 0 : n;
  }
  return 0;
}

function brandLabel(raw: OffProductRaw): string | null {
  if (Array.isArray(raw.brands)) return raw.brands[0]?.trim() ?? null;
  return raw.brands?.split(",")[0]?.trim() ?? null;
}

function parseServingG(product: OffProductRaw): { grams: number; label: string | null } {
  const raw = product.serving_size ?? product.quantity ?? "";
  const match = raw.match(/(\d+(?:[.,]\d+)?)\s*(g|ml|kg|l)/i);
  if (!match) return { grams: 100, label: raw || "100 g" };
  let val = parseFloat(match[1].replace(",", "."));
  const unit = match[2].toLowerCase();
  if (unit === "kg") val *= 1000;
  if (unit === "l") val *= 1000;
  return { grams: Math.max(1, Math.round(val)), label: raw };
}

export function scoreAustriaProduct(raw: OffProductRaw, brand: string | null): number {
  return scoreDachProduct(raw, brand);
}

/** DACH ranking: Austria + Germany + common retail brands (Billa, Rewe, Lidl, DM, …). */
export function scoreDachProduct(raw: OffProductRaw, brand: string | null): number {
  let score = 0;
  const tags = [...(raw.countries_tags ?? []), ...(raw.origins_tags ?? [])]
    .join(" ")
    .toLowerCase();
  const brands = `${Array.isArray(raw.brands) ? raw.brands.join(" ") : raw.brands ?? ""} ${brand ?? ""}`.toLowerCase();
  if (
    tags.includes("austria") ||
    tags.includes("en:austria") ||
    tags.includes("österreich") ||
    tags.includes("germany") ||
    tags.includes("en:germany") ||
    tags.includes("deutschland")
  ) {
    score += 55;
  }
  for (const kw of AT_BRAND_KEYWORDS) {
    if (brands.includes(kw)) {
      score += 35;
      break;
    }
  }
  for (const kw of DE_BRAND_KEYWORDS) {
    if (brands.includes(kw)) {
      score += 30;
      break;
    }
  }
  if (raw.product_name_de?.trim()) score += 15;
  return score;
}

export function mapOffProduct(raw: OffProductRaw): FoodProduct | null {
  const code = String(raw.code ?? raw._id ?? "").trim();
  const name =
    raw.product_name_de?.trim() ||
    raw.product_name?.trim() ||
    raw.product_name_en?.trim() ||
    raw.generic_name?.trim();
  if (!code || !name) return null;

  const n = raw.nutriments ?? {};
  const kcal =
    num(n["energy-kcal_100g"]) ||
    num(n["energy-kcal"]) ||
    (num(n["energy_100g"]) > 0 ? Math.round(num(n["energy_100g"]) / 4.184) : 0);

  const { grams, label } = parseServingG(raw);
  const brand = brandLabel(raw);

  const sat = num(n["saturated-fat_100g"] ?? n["saturated-fat"]);
  const mono = num(n["monounsaturated-fat_100g"] ?? n["monounsaturated-fat"]);
  const poly = num(n["polyunsaturated-fat_100g"] ?? n["polyunsaturated-fat"]);
  const unsat =
    mono + poly > 0 ? Math.round((mono + poly) * 10) / 10 : null;

  return {
    offCode: code,
    barcode: code,
    name,
    brand,
    calories: Math.round(kcal * 10) / 10,
    proteinG: Math.round(num(n.proteins_100g ?? n.proteins) * 10) / 10,
    carbsG: Math.round(num(n.carbohydrates_100g ?? n.carbohydrates) * 10) / 10,
    fatG: Math.round(num(n.fat_100g ?? n.fat) * 10) / 10,
    fiberG: Math.round(num(n.fiber_100g ?? n.fiber) * 10) / 10 || null,
    extended: {
      sugarG: num(n.sugars_100g ?? n.sugars) || null,
      fiberG: num(n.fiber_100g ?? n.fiber) || null,
      saltG: num(n.salt_100g ?? n.sodium_100g ?? n.sodium) || null,
      saturatedFatG: sat || null,
      unsaturatedFatG: unsat,
      potassiumMg: num(n.potassium_100g ?? n.potassium) || null,
      magnesiumMg: num(n.magnesium_100g ?? n.magnesium) || null,
      calciumMg: num(n.calcium_100g ?? n.calcium) || null,
    },
    servingG: grams,
    servingLabel: label,
    imageUrl:
      raw.image_front_small_url ??
      raw.image_small_url ??
      raw.image_url ??
      null,
    category: raw.categories_tags?.[0]?.replace(/^en:/, "") ?? "other",
    source: "openfoodfacts",
    countries: raw.countries_tags ?? [],
    austriaScore: scoreAustriaProduct(raw, brand),
  };
}

export function rankOffProducts(products: FoodProduct[], query: string): FoodProduct[] {
  const q = query.toLowerCase();
  return [...products].sort((a, b) => {
    const sa = (a.austriaScore ?? 0) + nameMatchBonus(a, q);
    const sb = (b.austriaScore ?? 0) + nameMatchBonus(b, q);
    return sb - sa;
  });
}

function nameMatchBonus(p: FoodProduct, q: string): number {
  if (!q) return 0;
  const n = `${p.name} ${p.brand ?? ""}`.toLowerCase();
  if (n.startsWith(q)) return 25;
  if (n.includes(q)) return 12;
  return 0;
}

async function fetchWithTimeout(
  url: string,
  label: string,
  timeoutMs = TIMEOUT_MS
): Promise<{ res: Response; text: string; durationMs: number }> {
  const started = Date.now();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent": OFF_USER_AGENT,
        Accept: "application/json",
      },
      cache: "no-store",
    });
    const text = await res.text();
    const durationMs = Date.now() - started;
    logOffRequest(label, url, {
      status: res.status,
      ok: res.ok,
      durationMs,
      bodyPreview: text,
    });
    return { res, text, durationMs };
  } catch (error) {
    const durationMs = Date.now() - started;
    logOffRequest(label, url, { durationMs, error });
    throw error;
  } finally {
    clearTimeout(timer);
  }
}

function parseJsonBody<T>(text: string, label: string): T | null {
  const trimmed = text.trim();
  if (!trimmed.startsWith("{") && !trimmed.startsWith("[")) {
    logOffRequest(`${label}-parse`, "", {
      bodyPreview: trimmed,
      error: `Non-JSON response (likely HTML/block): ${trimmed.slice(0, 80)}`,
    });
    return null;
  }
  try {
    return JSON.parse(trimmed) as T;
  } catch (error) {
    logOffRequest(`${label}-parse`, "", { bodyPreview: trimmed, error });
    return null;
  }
}

async function searchSearchALicious(
  query: string,
  pageSize: number
): Promise<FoodProduct[]> {
  const params = new URLSearchParams({
    q: query,
    page_size: String(pageSize),
    fields:
      "code,product_name,product_name_de,brands,brands_tags,nutriments,serving_size,quantity,image_front_small_url,image_small_url,countries_tags,origins_tags,categories_tags",
  });
  const url = `${SEARCH_A_LICIOUS}?${params}`;
  const { res, text } = await fetchWithTimeout(url, "search-a-licious");
  if (!res.ok) {
    throw new Error(`Search-a-licious HTTP ${res.status}`);
  }
  const data = parseJsonBody<SearchALiciousResponse>(text, "search-a-licious");
  if (!data?.hits) return [];
  return data.hits
    .map(mapOffProduct)
    .filter((p): p is FoodProduct => p !== null);
}

async function searchLegacyCgi(
  base: string,
  query: string,
  pageSize: number
): Promise<FoodProduct[]> {
  const params = new URLSearchParams({
    search_terms: query,
    search_simple: "1",
    action: "process",
    json: "1",
    page_size: String(pageSize),
    lc: "de",
    cc: "at",
  });
  const url = `${base}/cgi/search.pl?${params}`;
  const { res, text } = await fetchWithTimeout(url, `legacy-${base}`);
  if (!res.ok) {
    throw new Error(`Legacy search HTTP ${res.status}`);
  }
  const data = parseJsonBody<{ products?: OffProductRaw[] }>(text, "legacy-cgi");
  if (!data?.products) return [];
  return data.products
    .map(mapOffProduct)
    .filter((p): p is FoodProduct => p !== null);
}

async function runWithRetry<T>(
  fn: () => Promise<T>,
  label: string
): Promise<T> {
  let lastError: unknown;
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      if (attempt > 0) {
        await new Promise((r) => setTimeout(r, 400 * attempt));
        console.log(`[open-food-facts] retry ${label} attempt ${attempt + 1}`);
      }
      return await fn();
    } catch (e) {
      lastError = e;
    }
  }
  throw lastError;
}

const searchCache = new Map<string, { expires: number; data: FoodProduct[] }>();

export async function searchOpenFoodFacts(
  query: string,
  pageSize = 24
): Promise<{ products: FoodProduct[]; error?: string; source?: string }> {
  const q = query.trim();
  if (q.length < 2) return { products: [] };

  const cacheKey = `v2:${q}:${pageSize}`;
  const hit = searchCache.get(cacheKey);
  if (hit && hit.expires > Date.now()) {
    return { products: hit.data, source: "cache" };
  }

  const errors: string[] = [];

  try {
    const salProducts = await runWithRetry(
      () => searchSearchALicious(q, pageSize),
      "search-a-licious"
    );
    if (salProducts.length > 0) {
      const ranked = rankOffProducts(salProducts, q);
      searchCache.set(cacheKey, { data: ranked, expires: Date.now() + 5 * 60_000 });
      return { products: ranked, source: "search-a-licious" };
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Search-a-licious Fehler";
    errors.push(msg);
    console.error("[open-food-facts] search-a-licious failed:", msg);
  }

  for (const base of [OFF_AT, OFF_WORLD]) {
    try {
      const legacy = await runWithRetry(
        () => searchLegacyCgi(base, q, pageSize),
        `legacy-${base}`
      );
      if (legacy.length > 0) {
        const ranked = rankOffProducts(legacy, q);
        searchCache.set(cacheKey, { data: ranked, expires: Date.now() + 5 * 60_000 });
        return { products: ranked, source: "legacy-cgi" };
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Legacy-Suche Fehler";
      errors.push(msg);
      console.error(`[open-food-facts] legacy ${base} failed:`, msg);
    }
  }

  return {
    products: [],
    error:
      errors[0] ??
      "Open Food Facts: keine Produkte gefunden (API blockiert oder offline)",
    source: "none",
  };
}

export async function fetchOffProductByCode(
  code: string
): Promise<{ product: FoodProduct | null; error?: string }> {
  const c = code.replace(/\D/g, "");
  if (c.length < 8) return { product: null, error: "Ungültiger Barcode" };

  const url = `${OFF_WORLD}/api/v2/product/${c}.json`;
  try {
    const { res, text } = await fetchWithTimeout(url, "product-v2");
    const data = parseJsonBody<{ product?: OffProductRaw; status?: number }>(
      text,
      "product-v2"
    );
    if (!data || data.status === 0 || !data.product) {
      return { product: null, error: "Produkt nicht gefunden" };
    }
    const product = mapOffProduct(data.product);
    return { product };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Produkt-Abruf fehlgeschlagen";
    console.error("[open-food-facts] product", msg);
    return { product: null, error: msg };
  }
}

export async function suggestOpenFoodFacts(query: string): Promise<string[]> {
  const q = query.trim();
  if (q.length < 2) return [];
  try {
    const params = new URLSearchParams({
      tagtype: "products",
      term: q,
      lc: "de",
      cc: "at",
    });
    const url = `${OFF_WORLD}/cgi/suggest.pl?${params}`;
    const { res, text } = await fetchWithTimeout(url, "suggest", 3000);
    if (!res.ok || text.trim().startsWith("<")) return [];
    return text
      .split("\n")
      .map((s) => s.trim())
      .filter(Boolean)
      .slice(0, 8);
  } catch {
    return [];
  }
}
