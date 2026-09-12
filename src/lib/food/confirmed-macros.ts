import type { MacroTotals, FoodMacroSource } from "@/lib/food-macros";
import { macrosForQuantity, roundMacros } from "@/lib/food-macros";

/**
 * Canonical preview macros for a food + grams — same numbers the user confirms
 * and that must be persisted (via servingG = quantity snapshot).
 */
export function confirmedMacrosForQuantity(
  food: FoodMacroSource,
  quantityG: number
): MacroTotals {
  return roundMacros(macrosForQuantity(food, quantityG));
}

/**
 * Persist exact confirmed totals by storing servingG = quantityG.
 * macrosForQuantity(snapshot, quantityG) then returns the same rounded totals.
 */
export function foodSnapshotFromConfirmed(
  name: string,
  confirmed: MacroTotals,
  quantityG: number,
  extras?: { brand?: string | null; fiberG?: number | null }
): {
  name: string;
  brand: string | null;
  calories: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  fiberG: number | null;
  servingG: number;
} {
  const qty = Math.min(5000, Math.max(1, quantityG));
  const macros = roundMacros(confirmed);
  return {
    name,
    brand: extras?.brand ?? null,
    calories: macros.calories,
    proteinG: macros.proteinG,
    carbsG: macros.carbsG,
    fatG: macros.fatG,
    fiberG: extras?.fiberG ?? null,
    servingG: qty,
  };
}

/** Verify preview === recompute from snapshot (regression helper). */
export function previewMatchesSnapshot(
  confirmed: MacroTotals,
  quantityG: number
): boolean {
  const snap = foodSnapshotFromConfirmed("x", confirmed, quantityG);
  const again = confirmedMacrosForQuantity(snap, quantityG);
  return (
    again.calories === confirmed.calories &&
    again.proteinG === confirmed.proteinG &&
    again.carbsG === confirmed.carbsG &&
    again.fatG === confirmed.fatG
  );
}
