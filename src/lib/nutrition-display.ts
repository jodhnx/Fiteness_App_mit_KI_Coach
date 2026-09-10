/** Single source for calorie/macro UI copy — remaining is always derived, never trusted. */

import type { NutritionDashboardPayload } from "@/lib/nutrition-defaults";
import { nutritionProfileIncomplete } from "@/lib/nutrition-defaults";
import {
  coerceToKilocalories,
  sanitizeCalorieTarget,
  sanitizeExerciseKcal,
} from "@/lib/daily-kcal";

export type CalorieDisplay = {
  primaryValue: number;
  primaryLabel: string;
  secondaryLine: string;
  isOver: boolean;
  overBy: number;
  remaining: number;
  consumed: number;
  target: number;
};

export type MacroDisplay = {
  primaryLine: string;
  secondaryLine: string;
  isOver: boolean;
  remainingG: number;
  consumedG: number;
  targetG: number;
};

export type NutritionDisplayState =
  | { kind: "loading" }
  | { kind: "missing_target"; profileIncomplete: boolean }
  | {
      kind: "ready";
      consumed: number;
      target: number;
      remainingFromDashboard: number;
      cal: CalorieDisplay;
    };

export function hasCalorieTarget(d: NutritionDashboardPayload | null | undefined): boolean {
  return (d?.targets?.calories ?? 0) > 0;
}

/** Distinguish loading, missing target, and real remaining values. */
export function resolveNutritionDisplayState(
  dashboard: NutritionDashboardPayload | null | undefined,
  options?: { loading?: boolean }
): NutritionDisplayState {
  if (options?.loading || dashboard == null) {
    return { kind: "loading" };
  }

  const target = sanitizeCalorieTarget(dashboard.targets?.calories) ?? 0;
  if (target <= 0) {
    return {
      kind: "missing_target",
      profileIncomplete: nutritionProfileIncomplete(dashboard),
    };
  }

  const consumed = coerceToKilocalories(dashboard.consumed?.calories);
  const remainingFromDashboard = dashboard.remaining?.calories ?? null;
  const burned = sanitizeExerciseKcal(dashboard.exerciseBurned?.calories);
  const cal = getCalorieDisplay(consumed, target, remainingFromDashboard, burned);

  return {
    kind: "ready",
    consumed,
    target,
    remainingFromDashboard: cal.remaining,
    cal,
  };
}

/**
 * remaining = target − consumed + exerciseBurned
 * Over-target uses the same net (never ignore exercise credit).
 */
export function getCalorieDisplay(
  consumed: number,
  target: number,
  _remainingFromDashboard?: number | null,
  exerciseBurned?: number | null
): CalorieDisplay {
  const consumedR = coerceToKilocalories(consumed);
  const targetR = sanitizeCalorieTarget(target) ?? 0;
  const burnedR = sanitizeExerciseKcal(exerciseBurned);

  if (targetR <= 0) {
    return {
      primaryValue: 0,
      primaryLabel: "kcal übrig",
      secondaryLine: `${consumedR.toLocaleString("de-DE")} gegessen`,
      isOver: false,
      overBy: 0,
      remaining: 0,
      consumed: consumedR,
      target: 0,
    };
  }

  // Always derive remaining. Never trust a cached remaining field — that is
  // how millicalorie / locale-stripped targets leaked into the UI.
  const net = targetR - consumedR + burnedR;

  const isOver = net < 0;
  const overBy = isOver ? Math.abs(Math.round(net)) : 0;
  const remaining = Math.max(0, Math.round(net));

  return {
    primaryValue: isOver ? overBy : remaining,
    primaryLabel: isOver ? "kcal über dem Ziel" : "kcal übrig",
    secondaryLine: `${consumedR.toLocaleString("de-DE")} gegessen von ${targetR.toLocaleString("de-DE")}`,
    isOver,
    overBy,
    remaining,
    consumed: consumedR,
    target: targetR,
  };
}

export function getMacroDisplay(
  consumed: number,
  target: number,
  label: string
): MacroDisplay {
  const consumedG = Math.round(consumed);
  const targetG = Math.round(target);
  const overBy = targetG > 0 ? Math.max(0, consumedG - targetG) : 0;
  const isOver = overBy > 0;
  const remainingG = targetG > 0 ? Math.max(0, targetG - consumedG) : 0;

  return {
    primaryLine: isOver
      ? `${overBy} g ${label} über Ziel`
      : `${remainingG} g ${label} übrig`,
    secondaryLine: targetG > 0 ? `${consumedG} / ${targetG} g` : `${consumedG} g`,
    isOver,
    remainingG,
    consumedG,
    targetG,
  };
}

/** Remaining macros aligned with server (includes exercise kcal credit). */
export function computeNutritionRemaining(dashboard: {
  targets: Pick<
    NutritionDashboardPayload["targets"],
    "calories" | "proteinG" | "carbsG" | "fatG"
  >;
  consumed: Pick<
    NutritionDashboardPayload["consumed"],
    "calories" | "proteinG" | "carbsG" | "fatG"
  >;
  exerciseBurned?: NutritionDashboardPayload["exerciseBurned"];
}): NutritionDashboardPayload["remaining"] {
  const burned = sanitizeExerciseKcal(dashboard.exerciseBurned?.calories);
  const consumedCal = coerceToKilocalories(dashboard.consumed.calories);
  const targetCal = sanitizeCalorieTarget(dashboard.targets.calories) ?? 0;
  const { consumed, targets } = dashboard;
  return {
    calories: Math.max(0, targetCal - consumedCal + burned),
    proteinG: Math.max(0, targets.proteinG - consumed.proteinG),
    carbsG: Math.max(0, targets.carbsG - consumed.carbsG),
    fatG: Math.max(0, targets.fatG - consumed.fatG),
  };
}
