import type { FoodProduct } from "@/lib/food/food-product-types";
import { brandDefaultServingG } from "@/data/brand-restaurant-foods";

export type PortionPreset = {
  label: string;
  grams: number;
  default?: boolean;
};

function matchName(food: FoodProduct, ...patterns: string[]): boolean {
  const n = food.name.toLowerCase();
  return patterns.some((p) => n.includes(p));
}

/** Intelligente Standardportionen pro Lebensmitteltyp */
export function getPortionPresets(food: FoodProduct): PortionPreset[] {
  const serving = food.servingG > 0 ? food.servingG : 100;

  if (matchName(food, "pizza")) {
    return [
      { label: "1 ganze Pizza", grams: 350, default: true },
      { label: "1/2 Pizza", grams: 175 },
      { label: "1 Stück", grams: 45 },
      { label: "100 g", grams: 100 },
    ];
  }

  if (matchName(food, "banane")) {
    return [
      { label: "1 Banane", grams: 120, default: true },
      { label: "1/2 Banane", grams: 60 },
      { label: "100 g", grams: 100 },
    ];
  }

  if (matchName(food, "apfel")) {
    return [
      { label: "1 Apfel", grams: 180, default: true },
      { label: "1/2 Apfel", grams: 90 },
      { label: "100 g", grams: 100 },
    ];
  }

  if (matchName(food, "ei", "eier")) {
    return [
      { label: "1 Ei (M)", grams: 58, default: true },
      { label: "2 Eier", grams: 116 },
      { label: "100 g", grams: 100 },
    ];
  }

  if (
    matchName(food, "riegel", "protein bar", "quest", "corny", "müsliriegel")
  ) {
    const g = serving <= 80 ? serving : 60;
    return [
      { label: "1 Riegel", grams: g, default: true },
      { label: "1/2 Riegel", grams: Math.round(g / 2) },
      { label: "100 g", grams: 100 },
    ];
  }

  if (matchName(food, "döner", "kebap", "kebab", "dürüm")) {
    return [
      { label: "1 Portion", grams: 250, default: true },
      { label: "1/2 Portion", grams: 125 },
      { label: "100 g", grams: 100 },
    ];
  }

  if (matchName(food, "burger", "cheeseburger", "hamburger")) {
    return [
      { label: "1 Burger", grams: 180, default: true },
      { label: "100 g", grams: 100 },
    ];
  }

  if (matchName(food, "schnitzel")) {
    return [
      { label: "1 Schnitzel", grams: 150, default: true },
      { label: "100 g", grams: 100 },
    ];
  }

  if (matchName(food, "pommes", "frites")) {
    return [
      { label: "1 Portion", grams: 150, default: true },
      { label: "1/2 Portion", grams: 75 },
      { label: "100 g", grams: 100 },
    ];
  }

  if (matchName(food, "pasta", "spaghetti", "lasagne", "bolognese", "nudel")) {
    return [
      { label: "1 Portion", grams: 350, default: true },
      { label: "1/2 Portion", grams: 175 },
      { label: "100 g", grams: 100 },
    ];
  }

  if (matchName(food, "sushi")) {
    return [
      { label: "1 Set (8 Stk.)", grams: 200, default: true },
      { label: "1 Stück", grams: 25 },
      { label: "100 g", grams: 100 },
    ];
  }

  if (matchName(food, "salat", "salad")) {
    return [
      { label: "1 Schüssel", grams: 250, default: true },
      { label: "1/2 Schüssel", grams: 125 },
      { label: "100 g", grams: 100 },
    ];
  }

  if (matchName(food, "steak", "rind", "hähnchen", "chicken", "pute")) {
    return [
      { label: "1 Portion", grams: serving >= 120 ? serving : 200, default: true },
      { label: "100 g", grams: 100 },
      { label: "150 g", grams: 150 },
    ];
  }

  if (matchName(food, "skyr", "magerquark", "quark", "joghurt", "pudding")) {
    const g = serving >= 100 ? serving : 150;
    return [
      { label: "1 Becher", grams: g, default: true },
      { label: "1/2 Becher", grams: Math.round(g / 2) },
      { label: "100 g", grams: 100 },
    ];
  }

  if (matchName(food, "whey", "protein pulver", "casein")) {
    return [
      { label: "1 Portion (30 g)", grams: 30, default: true },
      { label: "1 Messlöffel (25 g)", grams: 25 },
      { label: "50 g", grams: 50 },
      { label: "100 g", grams: 100 },
    ];
  }

  if (matchName(food, "reis", "rice", "haferflocken", "müsli")) {
    return [
      { label: "1 Portion", grams: serving, default: true },
      { label: "100 g", grams: 100 },
      { label: "50 g", grams: 50 },
    ];
  }

  if (serving !== 100) {
    return [
      { label: `1 Portion (${serving} g)`, grams: serving, default: true },
      { label: "100 g", grams: 100 },
      { label: "50 g", grams: 50 },
    ];
  }

  return [
    { label: "100 g", grams: 100, default: true },
    { label: "150 g", grams: 150 },
    { label: "50 g", grams: 50 },
    { label: "200 g", grams: 200 },
  ];
}

export function getDefaultQuickAddGrams(food: FoodProduct): number {
  const brandG = brandDefaultServingG(food);
  if (brandG != null) return brandG;
  const presets = getPortionPresets(food);
  return presets.find((p) => p.default)?.grams ?? presets[0]?.grams ?? 100;
}

export function getDefaultPortionGrams(food: FoodProduct): number {
  return getDefaultQuickAddGrams(food);
}
