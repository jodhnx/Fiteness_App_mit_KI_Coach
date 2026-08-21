import type { FoodProduct } from "@/lib/food/food-product-types";

/**
 * Fast-Food & Markenprodukte mit veröffentlichten Nährwerten (pro Portion).
 * Quelle: Hersteller-Nährwertangaben (öffentlich). Keine Fantasiewerte.
 * servingG = typisches Portionsgewicht; calories/macros für DIESE Portion →
 * beim Import werden sie auf per-100g normalisiert.
 */
type BrandDish = {
  name: string;
  brand: string;
  calories: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  servingG: number;
  servingLabel: string;
  category?: string;
};

const BRAND_DISHES: BrandDish[] = [
  // McDonald's (DE/AT — veröffentlichte Werte, Stück)
  { name: "Cheeseburger", brand: "McDonald's", calories: 313, proteinG: 16, carbsG: 31, fatG: 14, servingG: 119, servingLabel: "1 Burger", category: "FAST_FOOD" },
  { name: "Hamburger", brand: "McDonald's", calories: 254, proteinG: 13, carbsG: 30, fatG: 9, servingG: 105, servingLabel: "1 Burger", category: "FAST_FOOD" },
  { name: "Big Mac", brand: "McDonald's", calories: 508, proteinG: 26, carbsG: 41, fatG: 26, servingG: 219, servingLabel: "1 Burger", category: "FAST_FOOD" },
  { name: "McChicken", brand: "McDonald's", calories: 427, proteinG: 17, carbsG: 41, fatG: 21, servingG: 170, servingLabel: "1 Burger", category: "FAST_FOOD" },
  { name: "McNuggets 6 Stück", brand: "McDonald's", calories: 260, proteinG: 15, carbsG: 16, fatG: 15, servingG: 97, servingLabel: "6 Stück", category: "FAST_FOOD" },
  { name: "Pommes klein", brand: "McDonald's", calories: 230, proteinG: 3, carbsG: 29, fatG: 11, servingG: 75, servingLabel: "1 Portion klein", category: "FAST_FOOD" },
  { name: "Pommes mittel", brand: "McDonald's", calories: 340, proteinG: 4, carbsG: 43, fatG: 16, servingG: 110, servingLabel: "1 Portion mittel", category: "FAST_FOOD" },

  // Burger King
  { name: "Whopper", brand: "Burger King", calories: 630, proteinG: 28, carbsG: 49, fatG: 35, servingG: 270, servingLabel: "1 Burger", category: "FAST_FOOD" },
  { name: "Cheeseburger", brand: "Burger King", calories: 300, proteinG: 15, carbsG: 29, fatG: 14, servingG: 120, servingLabel: "1 Burger", category: "FAST_FOOD" },
  { name: "Chicken Nuggets 6 Stück", brand: "Burger King", calories: 260, proteinG: 13, carbsG: 16, fatG: 16, servingG: 90, servingLabel: "6 Stück", category: "FAST_FOOD" },

  // KFC
  { name: "Original Recipe Chicken", brand: "KFC", calories: 320, proteinG: 28, carbsG: 8, fatG: 19, servingG: 140, servingLabel: "1 Stück", category: "FAST_FOOD" },
  { name: "Zinger Burger", brand: "KFC", calories: 520, proteinG: 28, carbsG: 43, fatG: 26, servingG: 210, servingLabel: "1 Burger", category: "FAST_FOOD" },

  // Subway
  { name: "Chicken Teriyaki 15cm", brand: "Subway", calories: 330, proteinG: 25, carbsG: 47, fatG: 4.5, servingG: 240, servingLabel: "15 cm", category: "FAST_FOOD" },
  { name: "Italian B.M.T. 15cm", brand: "Subway", calories: 390, proteinG: 19, carbsG: 44, fatG: 15, servingG: 230, servingLabel: "15 cm", category: "FAST_FOOD" },

  // Domino's / Pizza (Stück ≈ 1/8)
  { name: "Salami Pizza Stück", brand: "Domino's", calories: 280, proteinG: 12, carbsG: 28, fatG: 13, servingG: 100, servingLabel: "1 Stück", category: "FAST_FOOD" },
  { name: "Margherita Pizza Stück", brand: "Pizza Hut", calories: 220, proteinG: 10, carbsG: 27, fatG: 8, servingG: 95, servingLabel: "1 Stück", category: "FAST_FOOD" },

  // Restaurant / generisch / selbstgemacht (pro 100g oder typische Portion)
  { name: "Cheeseburger Restaurant", brand: "Restaurant", calories: 280, proteinG: 15, carbsG: 26, fatG: 13, servingG: 100, servingLabel: "100 g", category: "MEAL" },
  { name: "Cheeseburger selbstgemacht", brand: "Selbstgemacht", calories: 250, proteinG: 16, carbsG: 22, fatG: 11, servingG: 100, servingLabel: "100 g", category: "MEAL" },
  { name: "Pommes Restaurant", brand: "Restaurant", calories: 312, proteinG: 3.4, carbsG: 41, fatG: 15, servingG: 100, servingLabel: "100 g", category: "SIDE" },
  { name: "Pizza Salami Stück", brand: "Restaurant", calories: 290, proteinG: 12, carbsG: 30, fatG: 14, servingG: 100, servingLabel: "1 Stück ≈ 100 g", category: "MEAL" },
];

/** Convert portion macros → per-100g FoodProduct for consistent scaling. */
function toProduct(d: BrandDish): FoodProduct {
  const factor = 100 / d.servingG;
  return {
    name: d.name,
    brand: d.brand,
    calories: Math.round(d.calories * factor),
    proteinG: Number((d.proteinG * factor).toFixed(1)),
    carbsG: Number((d.carbsG * factor).toFixed(1)),
    fatG: Number((d.fatG * factor).toFixed(1)),
    fiberG: null,
    servingG: 100,
    servingLabel: d.servingLabel,
    category: d.category,
    source: "local",
    // Store original portion for UI defaults via austriaScore unused field — use servingLabel
  };
}

const PRODUCTS = BRAND_DISHES.map(toProduct);

export function searchBrandRestaurantFoods(query: string, limit = 20): FoodProduct[] {
  const q = query.trim().toLowerCase();
  if (q.length < 2) return [];

  const tokens = q.split(/\s+/).filter(Boolean);

  return PRODUCTS.filter((p) => {
    const hay = `${p.name} ${p.brand ?? ""}`.toLowerCase();
    return tokens.every((t) => hay.includes(t));
  })
    .slice(0, limit)
    .map((p) => ({ ...p }));
}

/** Default quick-add grams from servingLabel / known brand portion. */
export function brandDefaultServingG(product: FoodProduct): number | null {
  const match = BRAND_DISHES.find(
    (d) =>
      d.name === product.name &&
      d.brand === product.brand
  );
  return match?.servingG ?? null;
}
