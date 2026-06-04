export type MacroTotals = {
  calories: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
};

export type FoodMacroSource = {
  calories: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  servingG: number;
};

export function macrosForQuantity(food: FoodMacroSource, quantityG: number): MacroTotals {
  const ratio = quantityG / (food.servingG || 100);
  return {
    calories: Math.round(food.calories * ratio * 10) / 10,
    proteinG: Math.round(food.proteinG * ratio * 10) / 10,
    carbsG: Math.round(food.carbsG * ratio * 10) / 10,
    fatG: Math.round(food.fatG * ratio * 10) / 10,
  };
}

export function sumMacros(items: MacroTotals[]): MacroTotals {
  return items.reduce(
    (acc, m) => ({
      calories: acc.calories + m.calories,
      proteinG: acc.proteinG + m.proteinG,
      carbsG: acc.carbsG + m.carbsG,
      fatG: acc.fatG + m.fatG,
    }),
    { calories: 0, proteinG: 0, carbsG: 0, fatG: 0 }
  );
}

export function roundMacros(m: MacroTotals): MacroTotals {
  return {
    calories: Math.round(m.calories),
    proteinG: Math.round(m.proteinG),
    carbsG: Math.round(m.carbsG),
    fatG: Math.round(m.fatG),
  };
}
