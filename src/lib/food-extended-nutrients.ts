import type {
  ExtendedNutrientsPer100g,
  FoodProduct,
} from "@/lib/food/food-product-types";
import { macrosForQuantity, type FoodMacroSource } from "@/lib/food-macros";
import { productToMacroSource } from "@/lib/food-per-100g";

export type ScaledNutrients = {
  macros: ReturnType<typeof macrosForQuantity>;
  extended: {
    sugarG: number | null;
    fiberG: number | null;
    saltG: number | null;
    saturatedFatG: number | null;
    unsaturatedFatG: number | null;
    potassiumMg: number | null;
    magnesiumMg: number | null;
    calciumMg: number | null;
  };
};

function scaleOptional(
  per100: number | null | undefined,
  quantityG: number
): number | null {
  if (per100 == null || Number.isNaN(per100)) return null;
  return Math.round((per100 * quantityG) / 100 * 10) / 10;
}

export function extractExtendedPer100g(product: FoodProduct): ExtendedNutrientsPer100g {
  const serving = product.servingG || 100;
  const ratio = 100 / serving;
  const ext = product.extended;
  if (ext) return ext;

  return {
    fiberG: product.fiberG != null ? product.fiberG * ratio : null,
    sugarG: null,
    saltG: null,
    saturatedFatG: null,
    unsaturatedFatG: null,
    potassiumMg: null,
    magnesiumMg: null,
    calciumMg: null,
  };
}

export function scaleNutrientsForQuantity(
  product: FoodProduct,
  quantityG: number
): ScaledNutrients | null {
  if (!quantityG || quantityG <= 0) return null;
  const source: FoodMacroSource = productToMacroSource(product);
  const macros = macrosForQuantity(source, quantityG);
  const per100 = extractExtendedPer100g(product);

  return {
    macros,
    extended: {
      sugarG: scaleOptional(per100.sugarG, quantityG),
      fiberG: scaleOptional(per100.fiberG, quantityG),
      saltG: scaleOptional(per100.saltG, quantityG),
      saturatedFatG: scaleOptional(per100.saturatedFatG, quantityG),
      unsaturatedFatG: scaleOptional(per100.unsaturatedFatG, quantityG),
      potassiumMg: scaleOptional(per100.potassiumMg, quantityG),
      magnesiumMg: scaleOptional(per100.magnesiumMg, quantityG),
      calciumMg: scaleOptional(per100.calciumMg, quantityG),
    },
  };
}
