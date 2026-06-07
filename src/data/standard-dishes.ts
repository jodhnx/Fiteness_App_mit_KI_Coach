import type { FoodProduct } from "@/lib/food/food-product-types";

/** Restaurant & Alltagsgerichte — sofort durchsuchbar (auch ohne DB-Seed). */
const DISHES: Omit<FoodProduct, "source">[] = [
  { name: "Pizza Salami", brand: "Standardgericht", calories: 290, proteinG: 12, carbsG: 30, fatG: 14, fiberG: 2, servingG: 100 },
  { name: "Pizza Margherita", brand: "Standardgericht", calories: 266, proteinG: 11, carbsG: 33, fatG: 10, fiberG: 2, servingG: 100 },
  { name: "Pizza Tonno", brand: "Standardgericht", calories: 275, proteinG: 13, carbsG: 31, fatG: 12, fiberG: 2, servingG: 100 },
  { name: "Döner", brand: "Standardgericht", calories: 215, proteinG: 12, carbsG: 18, fatG: 11, fiberG: 2, servingG: 100 },
  { name: "Kebap Teller", brand: "Standardgericht", calories: 198, proteinG: 14, carbsG: 16, fatG: 9, fiberG: 3, servingG: 100 },
  { name: "Schnitzel", brand: "Standardgericht", calories: 250, proteinG: 18, carbsG: 12, fatG: 14, fiberG: 0, servingG: 100 },
  { name: "Pommes Frites", brand: "Standardgericht", calories: 312, proteinG: 3.4, carbsG: 41, fatG: 15, fiberG: 3, servingG: 100 },
  { name: "Burger", brand: "Standardgericht", calories: 265, proteinG: 14, carbsG: 28, fatG: 12, fiberG: 2, servingG: 100 },
  { name: "Cheeseburger", brand: "Standardgericht", calories: 303, proteinG: 16, carbsG: 28, fatG: 14, fiberG: 2, servingG: 100 },
  { name: "Pasta Bolognese", brand: "Standardgericht", calories: 145, proteinG: 6, carbsG: 18, fatG: 5, fiberG: 2, servingG: 100 },
  { name: "Lasagne", brand: "Standardgericht", calories: 135, proteinG: 7, carbsG: 14, fatG: 6, fiberG: 1.5, servingG: 100 },
  { name: "Sushi", brand: "Standardgericht", calories: 150, proteinG: 6, carbsG: 28, fatG: 2, fiberG: 1, servingG: 100 },
  { name: "Fried Rice", brand: "Standardgericht", calories: 163, proteinG: 4, carbsG: 28, fatG: 4, fiberG: 1, servingG: 100 },
  { name: "Hähnchen mit Reis", brand: "Standardgericht", calories: 155, proteinG: 12, carbsG: 18, fatG: 4, fiberG: 1, servingG: 100 },
  { name: "Steak", brand: "Standardgericht", calories: 271, proteinG: 26, carbsG: 0, fatG: 18, fiberG: 0, servingG: 100 },
  { name: "Gemischter Salat", brand: "Standardgericht", calories: 45, proteinG: 2, carbsG: 6, fatG: 1.5, fiberG: 2.5, servingG: 100 },
  { name: "Caesar Salad", brand: "Standardgericht", calories: 120, proteinG: 6, carbsG: 8, fatG: 8, fiberG: 2, servingG: 100 },
  { name: "Banane", brand: "Standardlebensmittel", calories: 89, proteinG: 1.1, carbsG: 23, fatG: 0.3, fiberG: 2.6, servingG: 100 },
  { name: "Reis gekocht", brand: "Standardlebensmittel", calories: 130, proteinG: 2.7, carbsG: 28, fatG: 0.3, fiberG: 0.4, servingG: 100 },
  { name: "Haferflocken", brand: "Standardlebensmittel", calories: 379, proteinG: 13, carbsG: 67, fatG: 7, fiberG: 10, servingG: 100 },
  { name: "Hähnchenbrust", brand: "Standardlebensmittel", calories: 165, proteinG: 31, carbsG: 0, fatG: 3.6, fiberG: 0, servingG: 100 },
  { name: "Whey Protein", brand: "Standardlebensmittel", calories: 400, proteinG: 80, carbsG: 8, fatG: 6, fiberG: 0, servingG: 100 },
  { name: "Skyr", brand: "Standardlebensmittel", calories: 63, proteinG: 11, carbsG: 4, fatG: 0.2, fiberG: 0, servingG: 100 },
  { name: "Ei", brand: "Standardlebensmittel", calories: 155, proteinG: 13, carbsG: 1.1, fatG: 11, fiberG: 0, servingG: 100 },
  { name: "Protein Pudding", brand: "Standardlebensmittel", calories: 75, proteinG: 10, carbsG: 6, fatG: 1, fiberG: 0, servingG: 100 },
  { name: "Magerquark", brand: "Standardlebensmittel", calories: 67, proteinG: 12, carbsG: 4, fatG: 0.2, fiberG: 0, servingG: 100 },
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
