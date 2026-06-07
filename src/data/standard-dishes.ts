import type { FoodProduct } from "@/lib/food/food-product-types";

/** Restaurant & Alltagsgerichte — sofort durchsuchbar (auch ohne DB-Seed). */
const DISHES: Omit<FoodProduct, "source">[] = [
  { name: "Pizza Salami", brand: "Standardgericht", calories: 290, proteinG: 12, carbsG: 30, fatG: 14, fiberG: 2, servingG: 350 },
  { name: "Pizza Margherita", brand: "Standardgericht", calories: 266, proteinG: 11, carbsG: 33, fatG: 10, fiberG: 2, servingG: 350 },
  { name: "Pizza Tonno", brand: "Standardgericht", calories: 275, proteinG: 13, carbsG: 31, fatG: 12, fiberG: 2, servingG: 350 },
  { name: "Döner", brand: "Standardgericht", calories: 215, proteinG: 12, carbsG: 18, fatG: 11, fiberG: 2, servingG: 250 },
  { name: "Kebap Teller", brand: "Standardgericht", calories: 198, proteinG: 14, carbsG: 16, fatG: 9, fiberG: 3, servingG: 400 },
  { name: "Schnitzel", brand: "Standardgericht", calories: 250, proteinG: 18, carbsG: 12, fatG: 14, fiberG: 0, servingG: 150 },
  { name: "Pommes Frites", brand: "Standardgericht", calories: 312, proteinG: 3.4, carbsG: 41, fatG: 15, fiberG: 3, servingG: 150 },
  { name: "Burger", brand: "Standardgericht", calories: 265, proteinG: 14, carbsG: 28, fatG: 12, fiberG: 2, servingG: 180 },
  { name: "Cheeseburger", brand: "Standardgericht", calories: 303, proteinG: 16, carbsG: 28, fatG: 14, fiberG: 2, servingG: 180 },
  { name: "Pasta Bolognese", brand: "Standardgericht", calories: 145, proteinG: 6, carbsG: 18, fatG: 5, fiberG: 2, servingG: 350 },
  { name: "Lasagne", brand: "Standardgericht", calories: 135, proteinG: 7, carbsG: 14, fatG: 6, fiberG: 1.5, servingG: 300 },
  { name: "Sushi", brand: "Standardgericht", calories: 150, proteinG: 6, carbsG: 28, fatG: 2, fiberG: 1, servingG: 200 },
  { name: "Fried Rice", brand: "Standardgericht", calories: 163, proteinG: 4, carbsG: 28, fatG: 4, fiberG: 1, servingG: 300 },
  { name: "Hähnchen mit Reis", brand: "Standardgericht", calories: 155, proteinG: 12, carbsG: 18, fatG: 4, fiberG: 1, servingG: 400 },
  { name: "Steak", brand: "Standardgericht", calories: 271, proteinG: 26, carbsG: 0, fatG: 18, fiberG: 0, servingG: 200 },
  { name: "Gemischter Salat", brand: "Standardgericht", calories: 45, proteinG: 2, carbsG: 6, fatG: 1.5, fiberG: 2.5, servingG: 200 },
  { name: "Caesar Salad", brand: "Standardgericht", calories: 120, proteinG: 6, carbsG: 8, fatG: 8, fiberG: 2, servingG: 250 },
];

export const STANDARD_DISH_SLUGS = new Set(
  DISHES.map((d) => d.name.toLowerCase())
);

export function searchStandardDishes(query: string, limit = 12): FoodProduct[] {
  const q = query.trim().toLowerCase();
  if (q.length < 2) return [];
  return DISHES.filter((d) => {
    const n = d.name.toLowerCase();
    return n.includes(q) || q.split(/\s+/).every((t) => n.includes(t));
  })
    .slice(0, limit)
    .map((d) => ({ ...d, source: "local" as const }));
}
