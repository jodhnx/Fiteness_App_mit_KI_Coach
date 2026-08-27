/** Single source for calorie/macro UI copy — uses dashboard remaining when provided. */

import type { NutritionDashboardPayload } from "@/lib/nutrition-defaults";
import { nutritionProfileIncomplete } from "@/lib/nutrition-defaults";

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

  const target = Math.round(dashboard.targets?.calories ?? 0);
  if (target <= 0) {
    return {
      kind: "missing_target",
      profileIncomplete: nutritionProfileIncomplete(dashboard),
    };
  }

  const consumed = dashboard.consumed?.calories ?? 0;
  const remainingFromDashboard = dashboard.remaining?.calories ?? null;

  return {
    kind: "ready",
    consumed,
    target,
    remainingFromDashboard:
      remainingFromDashboard != null ? Math.round(remainingFromDashboard) : 0,
    cal: getCalorieDisplay(consumed, target, remainingFromDashboard),
  };
}

export function getCalorieDisplay(
  consumed: number,
  target: number,
  remainingFromDashboard?: number | null
): CalorieDisplay {
  const consumedR = Math.round(consumed);
  const targetR = Math.round(target);

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

  const overBy = Math.max(0, consumedR - targetR);
  const isOver = overBy > 0;
  const remaining =
    remainingFromDashboard != null && !isOver
      ? Math.max(0, Math.round(remainingFromDashboard))
      : Math.max(0, targetR - consumedR);

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
  const burned = dashboard.exerciseBurned?.calories ?? 0;
  const { consumed, targets } = dashboard;
  return {
    calories: Math.max(0, targets.calories - consumed.calories + burned),
    proteinG: Math.max(0, targets.proteinG - consumed.proteinG),
    carbsG: Math.max(0, targets.carbsG - consumed.carbsG),
    fatG: Math.max(0, targets.fatG - consumed.fatG),
  };
}
