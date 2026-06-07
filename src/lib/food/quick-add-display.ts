import { macrosForQuantity } from "@/lib/food-macros";
import type { FoodProduct } from "@/lib/food/food-product-types";
import { getDefaultQuickAddGrams, getPortionPresets } from "@/lib/food/portion-presets";

function portionSuffixFromLabel(label: string): string {
  const l = label.toLowerCase();
  if (l.includes("becher") || l.includes("pudding") || l.includes("skyr")) return "pro Becher";
  if (l.includes("banane") || l.includes("apfel") || l.includes("stück") || l.includes("stk."))
    return "pro Stück";
  if (l.includes("riegel")) return "pro Riegel";
  if (l.includes("ei ")) return "pro Ei";
  if (l.includes("burger")) return "pro Burger";
  if (l.includes("100 g")) return "pro 100 g";
  if (
    l.includes("portion") ||
    l.includes("pizza") ||
    l.includes("schnitzel") ||
    l.includes("döner") ||
    l.includes("pasta")
  ) {
    return "pro Portion";
  }
  if (l.includes("schüssel")) return "pro Schüssel";
  return label.replace(/^1\s+/, "pro ");
}

export function getQuickAddDisplay(food: FoodProduct) {
  const presets = getPortionPresets(food);
  const defaultPreset = presets.find((p) => p.default) ?? presets[0];
  const grams = defaultPreset?.grams ?? getDefaultQuickAddGrams(food);
  const label = defaultPreset?.label ?? "1 Portion";
  const macros = macrosForQuantity(
    {
      calories: food.calories,
      proteinG: food.proteinG,
      carbsG: food.carbsG,
      fatG: food.fatG,
      servingG: food.servingG || 100,
    },
    grams
  );

  return {
    grams,
    kcal: Math.round(macros.calories),
    portionSuffix: portionSuffixFromLabel(label),
  };
}
