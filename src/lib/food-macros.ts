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

/** Grams to 1 decimal — matches Food Add preview (fmtG). Calories stay integers. */
function roundGram(n: number): number {
  return Math.round(n * 10) / 10;
}

/**
 * Canonical rounding for preview + save + dashboard aggregation.
 * kcal → integer; protein/carbs/fat → 1 decimal (e.g. 3.6 stays 3.6).
 */
export function roundMacros(m: MacroTotals): MacroTotals {
  return {
    calories: Math.round(m.calories),
    proteinG: roundGram(m.proteinG),
    carbsG: roundGram(m.carbsG),
    fatG: roundGram(m.fatG),
  };
}

/**
 * Scale food macros by grams. Preview and persisted snapshots must use this
 * same path so confirmed values never drift after save.
 */
export function macrosForQuantity(food: FoodMacroSource, quantityG: number): MacroTotals {
  const serving = food.servingG > 0 ? food.servingG : 100;
  const ratio = quantityG / serving;
  return roundMacros({
    calories: food.calories * ratio,
    proteinG: food.proteinG * ratio,
    carbsG: food.carbsG * ratio,
    fatG: food.fatG * ratio,
  });
}

export function sumMacros(items: MacroTotals[]): MacroTotals {
  return roundMacros(
    items.reduce(
      (acc, m) => ({
        calories: acc.calories + m.calories,
        proteinG: acc.proteinG + m.proteinG,
        carbsG: acc.carbsG + m.carbsG,
        fatG: acc.fatG + m.fatG,
      }),
      { calories: 0, proteinG: 0, carbsG: 0, fatG: 0 }
    )
  );
}
