import type { MacroTotals } from "@/lib/food-macros";
import type { NutritionDashboardPayload } from "@/lib/nutrition-defaults";

type Targets = { calories: number; proteinG: number; carbsG: number; fatG: number };

export type HomeCoachPayload = {
  summary: string;
  tips: { type: string; message: string; priority: "high" | "medium" | "low" }[];
};

export function buildNutritionCoachTips(
  consumed: MacroTotals,
  targets: Targets,
  nutritionGoal: string | null
): { type: string; message: string; priority: "high" | "medium" | "low"; actionHref?: string }[] {
  const tips: {
    type: string;
    message: string;
    priority: "high" | "medium" | "low";
    actionHref?: string;
  }[] = [];
  const proteinLeft = targets.proteinG - consumed.proteinG;
  const calLeft = targets.calories - consumed.calories;
  const carbsLeft = targets.carbsG - consumed.carbsG;
  const fatLeft = targets.fatG - consumed.fatG;

  if (proteinLeft > 25) {
    tips.push({
      type: "protein",
      message: `Heute fehlen dir noch ${Math.round(proteinLeft)}g Protein.`,
      priority: "high",
      actionHref: "/nutrition?add=LUNCH",
    });
  } else if (consumed.proteinG < targets.proteinG * 0.5 && consumed.calories > targets.calories * 0.4) {
    tips.push({
      type: "protein",
      message: "Proteinanteil ist heute niedrig – priorisiere proteinreiche Lebensmittel.",
      priority: "high",
      actionHref: "/nutrition?add=LUNCH",
    });
  }

  if (calLeft < -200) {
    tips.push({
      type: "calories",
      message: `Du liegst ${Math.abs(Math.round(calLeft))} kcal über dem Ziel. Leichte Portionen oder mehr Bewegung können ausgleichen.`,
      priority: "high",
      actionHref: "/nutrition",
    });
  } else if (calLeft > 400 && consumed.calories > 0) {
    tips.push({
      type: "calories",
      message: `Noch ${Math.round(calLeft)} kcal verfügbar – plane eine ausgewogene letzte Mahlzeit.`,
      priority: "medium",
      actionHref: "/nutrition",
    });
  }

  if (nutritionGoal === "FAT_LOSS" && fatLeft < -15) {
    tips.push({
      type: "fat",
      message: "Fettzufuhr über dem Ziel – reduziere Öle, Nüsse oder fettige Snacks.",
      priority: "medium",
    });
  }

  if (
    (nutritionGoal === "MUSCLE_GAIN" || nutritionGoal === "LEAN_BULK") &&
    carbsLeft > 80 &&
    consumed.calories > targets.calories * 0.6
  ) {
    tips.push({
      type: "carbs",
      message: `Für Energie und Regeneration: noch ca. ${Math.round(carbsLeft)} g Kohlenhydrate sinnvoll (Reis, Hafer, Obst).`,
      priority: "medium",
    });
  }

  if (fatLeft > 25 && consumed.fatG < targets.fatG * 0.4) {
    tips.push({
      type: "fat",
      message: "Gesunde Fette ergänzen: Avocado, Nüsse, Olivenöl oder Lachs.",
      priority: "low",
    });
  }

  return tips;
}

export function buildWaterCoachTip(
  consumedMl: number,
  targetMl: number
): { type: string; message: string; priority: "high" | "medium" | "low"; actionHref?: string } | null {
  const left = targetMl - consumedMl;
  if (left <= 0) return null;
  if (left <= 600) {
    return {
      type: "water",
      message: `${left}ml Wasser würden dein Tagesziel erfüllen.`,
      priority: "high",
      actionHref: "/nutrition",
    };
  }
  if (left <= 1200) {
    const glasses = Math.ceil(left / 250);
    return {
      type: "water",
      message: `Noch ca. ${glasses}× 250ml Wasser bis zum Tagesziel.`,
      priority: "medium",
      actionHref: "/nutrition",
    };
  }
  return null;
}

export function buildNutritionCoachTipsWithWater(
  consumed: MacroTotals,
  targets: Targets,
  nutritionGoal: string | null,
  waterConsumedMl: number,
  waterTargetMl: number
): { type: string; message: string; priority: "high" | "medium" | "low"; actionHref?: string }[] {
  const tips = buildNutritionCoachTips(consumed, targets, nutritionGoal);
  const waterTip = buildWaterCoachTip(waterConsumedMl, waterTargetMl);
  if (waterTip) {
    const proteinIdx = tips.findIndex((t) => t.type === "protein" && t.priority === "high");
    if (proteinIdx >= 0) tips.splice(proteinIdx + 1, 0, waterTip);
    else tips.unshift(waterTip);
  }
  return tips;
}

/** Live coach slice for Home — rebuilt on every nutrition sync */
export function buildHomeCoachFromNutrition(
  d: NutritionDashboardPayload
): HomeCoachPayload {
  const consumed = d?.consumed ?? { calories: 0, proteinG: 0, carbsG: 0, fatG: 0 };
  const targets = d?.targets ?? {
    calories: 0,
    proteinG: 0,
    carbsG: 0,
    fatG: 0,
    nutritionGoal: null,
  };
  const water = d?.water ?? { consumedMl: 0, targetMl: 2500 };
  const tips = buildNutritionCoachTipsWithWater(
    consumed,
    {
      calories: targets.calories ?? 0,
      proteinG: targets.proteinG ?? 0,
      carbsG: targets.carbsG ?? 0,
      fatG: targets.fatG ?? 0,
    },
    targets.nutritionGoal ?? null,
    water.consumedMl ?? 0,
    water.targetMl ?? 2500
  );
  return {
    summary: tips[0]?.message ?? "Gute Balance heute – weiter so und regelmäßig tracken.",
    tips,
  };
}
