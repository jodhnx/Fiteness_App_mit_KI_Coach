/** Single source for calorie/macro UI copy — uses dashboard remaining when provided. */

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

export function getCalorieDisplay(
  consumed: number,
  target: number,
  remainingFromDashboard?: number | null
): CalorieDisplay {
  const consumedR = Math.round(consumed);
  const targetR = Math.round(target);
  const overBy = targetR > 0 ? Math.max(0, consumedR - targetR) : 0;
  const isOver = overBy > 0;
  const remaining =
    remainingFromDashboard != null && !isOver
      ? Math.max(0, Math.round(remainingFromDashboard))
      : targetR > 0
        ? Math.max(0, targetR - consumedR)
        : 0;

  return {
    primaryValue: isOver ? overBy : remaining,
    primaryLabel: isOver ? "kcal über dem Ziel" : "kcal übrig",
    secondaryLine:
      targetR > 0
        ? `${consumedR.toLocaleString("de-DE")} gegessen von ${targetR.toLocaleString("de-DE")}`
        : `${consumedR.toLocaleString("de-DE")} gegessen`,
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
