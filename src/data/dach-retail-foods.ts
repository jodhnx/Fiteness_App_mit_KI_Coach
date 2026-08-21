import type { FoodProduct } from "@/lib/food/food-product-types";

/**
 * DACH staple products with retailer brand labels for search clarity.
 * Macros are standard per-100g values (EU reference / generic dairy & staples).
 * NOT invented specialty SKUs — Open Food Facts remains the source for barcode products.
 * Brand field helps users identify retailer context (BILLA, SPAR, HOFER, LIDL, …).
 */
type Staple = {
  name: string;
  brand: string;
  calories: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  servingG: number;
  servingLabel: string;
};

const STAPLES: Staple[] = [
  // Milch — ~1,5 % Fett, EU typische Werte pro 100 g
  { name: "Milch 1,5 %", brand: "BILLA", calories: 47, proteinG: 3.4, carbsG: 4.9, fatG: 1.5, servingG: 100, servingLabel: "100 g" },
  { name: "Milch 1,5 %", brand: "SPAR", calories: 47, proteinG: 3.4, carbsG: 4.9, fatG: 1.5, servingG: 100, servingLabel: "100 g" },
  { name: "Milch 1,5 %", brand: "HOFER", calories: 47, proteinG: 3.4, carbsG: 4.9, fatG: 1.5, servingG: 100, servingLabel: "100 g" },
  { name: "Milch 1,5 %", brand: "Lidl", calories: 47, proteinG: 3.4, carbsG: 4.9, fatG: 1.5, servingG: 100, servingLabel: "100 g" },
  { name: "Milch 1,5 %", brand: "Penny", calories: 47, proteinG: 3.4, carbsG: 4.9, fatG: 1.5, servingG: 100, servingLabel: "100 g" },
  { name: "Milch 3,5 %", brand: "BILLA", calories: 64, proteinG: 3.3, carbsG: 4.7, fatG: 3.5, servingG: 100, servingLabel: "100 g" },
  { name: "Milch 3,5 %", brand: "SPAR", calories: 64, proteinG: 3.3, carbsG: 4.7, fatG: 3.5, servingG: 100, servingLabel: "100 g" },

  // Joghurt / Skyr — typische Magerwerte
  { name: "Naturjoghurt 1,5 %", brand: "BILLA", calories: 50, proteinG: 4.5, carbsG: 5, fatG: 1.5, servingG: 150, servingLabel: "1 Becher (150 g)" },
  { name: "Naturjoghurt 1,5 %", brand: "SPAR", calories: 50, proteinG: 4.5, carbsG: 5, fatG: 1.5, servingG: 150, servingLabel: "1 Becher (150 g)" },
  { name: "Skyr natur", brand: "Lidl", calories: 63, proteinG: 11, carbsG: 4, fatG: 0.2, servingG: 150, servingLabel: "1 Becher (150 g)" },
  { name: "Skyr natur", brand: "HOFER", calories: 63, proteinG: 11, carbsG: 4, fatG: 0.2, servingG: 150, servingLabel: "1 Becher (150 g)" },
  { name: "Magerquark", brand: "BILLA", calories: 67, proteinG: 12, carbsG: 4, fatG: 0.2, servingG: 250, servingLabel: "1 Packung (250 g)" },
  { name: "Magerquark", brand: "SPAR", calories: 67, proteinG: 12, carbsG: 4, fatG: 0.2, servingG: 250, servingLabel: "1 Packung (250 g)" },
  { name: "Magerquark", brand: "HOFER", calories: 67, proteinG: 12, carbsG: 4, fatG: 0.2, servingG: 250, servingLabel: "1 Packung (250 g)" },
  // AT regional labels (same verified staple macros)
  { name: "Magertopfen", brand: "BILLA", calories: 67, proteinG: 12, carbsG: 4, fatG: 0.2, servingG: 250, servingLabel: "1 Packung (250 g)" },
  { name: "Magertopfen", brand: "SPAR", calories: 67, proteinG: 12, carbsG: 4, fatG: 0.2, servingG: 250, servingLabel: "1 Packung (250 g)" },
  { name: "Magertopfen", brand: "HOFER", calories: 67, proteinG: 12, carbsG: 4, fatG: 0.2, servingG: 250, servingLabel: "1 Packung (250 g)" },
  { name: "Topfen", brand: "BILLA", calories: 67, proteinG: 12, carbsG: 4, fatG: 0.2, servingG: 250, servingLabel: "1 Packung (250 g)" },
  { name: "Topfen", brand: "SPAR", calories: 67, proteinG: 12, carbsG: 4, fatG: 0.2, servingG: 250, servingLabel: "1 Packung (250 g)" },

  // Hafer / Eier / Basics
  { name: "Haferflocken", brand: "BILLA", calories: 379, proteinG: 13, carbsG: 67, fatG: 7, servingG: 40, servingLabel: "1 Portion (40 g)" },
  { name: "Haferflocken", brand: "SPAR", calories: 379, proteinG: 13, carbsG: 67, fatG: 7, servingG: 40, servingLabel: "1 Portion (40 g)" },
  { name: "Haferflocken", brand: "Lidl", calories: 379, proteinG: 13, carbsG: 67, fatG: 7, servingG: 40, servingLabel: "1 Portion (40 g)" },
  { name: "Eier", brand: "BILLA", calories: 155, proteinG: 13, carbsG: 1.1, fatG: 11, servingG: 60, servingLabel: "1 Ei (≈ 60 g)" },
  { name: "Eier", brand: "SPAR", calories: 155, proteinG: 13, carbsG: 1.1, fatG: 11, servingG: 60, servingLabel: "1 Ei (≈ 60 g)" },
  { name: "Eier", brand: "HOFER", calories: 155, proteinG: 13, carbsG: 1.1, fatG: 11, servingG: 60, servingLabel: "1 Ei (≈ 60 g)" },

  // DE Handel (gleiche Staple-Werte)
  { name: "Milch 1,5 %", brand: "REWE", calories: 47, proteinG: 3.4, carbsG: 4.9, fatG: 1.5, servingG: 100, servingLabel: "100 g" },
  { name: "Milch 1,5 %", brand: "EDEKA", calories: 47, proteinG: 3.4, carbsG: 4.9, fatG: 1.5, servingG: 100, servingLabel: "100 g" },
  { name: "Skyr natur", brand: "REWE", calories: 63, proteinG: 11, carbsG: 4, fatG: 0.2, servingG: 150, servingLabel: "1 Becher (150 g)" },
  { name: "Magerquark", brand: "REWE", calories: 67, proteinG: 12, carbsG: 4, fatG: 0.2, servingG: 250, servingLabel: "1 Packung (250 g)" },
];

function toProduct(s: Staple): FoodProduct {
  // Keep nutrients as per-100g; servingLabel drives default grams via brandDefaultServingG-like logic
  return {
    name: s.name,
    brand: s.brand,
    calories: s.calories,
    proteinG: s.proteinG,
    carbsG: s.carbsG,
    fatG: s.fatG,
    fiberG: null,
    servingG: 100,
    servingLabel: s.servingLabel,
    source: "local",
    category: "DAIRY",
  };
}

const PRODUCTS = STAPLES.map(toProduct);

/** Map name+brand → default portion grams for quick-add. */
const PORTION_BY_KEY = new Map(
  STAPLES.map((s) => [`${s.brand}|${s.name}`, s.servingG] as const)
);

export function dachRetailDefaultGrams(food: FoodProduct): number | null {
  if (!food.brand) return null;
  return PORTION_BY_KEY.get(`${food.brand}|${food.name}`) ?? null;
}

export function searchDachRetailFoods(
  query: string,
  limit = 24,
  country?: "AT" | "DE"
): FoodProduct[] {
  const q = query.trim().toLowerCase();
  if (q.length < 2) return [];
  const tokens = q.split(/\s+/).filter(Boolean);
  const atBrands = new Set([
    "billa",
    "spar",
    "hofer",
    "lidl",
    "penny",
  ]);
  const deBrands = new Set(["rewe", "edeka", "lidl", "aldi", "penny"]);

  return PRODUCTS.filter((p) => {
    const hay = `${p.name} ${p.brand ?? ""}`.toLowerCase();
    if (!tokens.every((t) => hay.includes(t))) return false;
    if (!country) return true;
    const b = (p.brand ?? "").toLowerCase();
    if (country === "AT") {
      // Prefer AT retailers; keep Lidl/Penny shared
      return atBrands.has(b) || b === "lidl" || b === "penny";
    }
    return deBrands.has(b) || b === "lidl" || b === "penny";
  })
    .slice(0, limit)
    .map((p) => ({ ...p }));
}
