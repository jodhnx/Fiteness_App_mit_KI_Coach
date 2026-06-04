import type { FoodMacroSource } from "@/lib/food-macros";
import type { FoodProduct } from "@/lib/food/food-product-types";

export function macrosPer100g(food: FoodMacroSource & { servingG?: number }) {
  const serving = food.servingG || 100;
  const ratio = 100 / serving;
  return {
    calories: Math.round(food.calories * ratio),
    proteinG: Math.round(food.proteinG * ratio * 10) / 10,
    carbsG: Math.round(food.carbsG * ratio * 10) / 10,
    fatG: Math.round(food.fatG * ratio * 10) / 10,
  };
}

export function productToMacroSource(product: FoodProduct): FoodMacroSource & {
  servingG: number;
} {
  return {
    calories: product.calories,
    proteinG: product.proteinG,
    carbsG: product.carbsG,
    fatG: product.fatG,
    servingG: product.servingG || 100,
  };
}
