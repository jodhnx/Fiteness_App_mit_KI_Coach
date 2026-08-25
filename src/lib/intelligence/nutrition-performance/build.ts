import { MEAL_TYPE_LABELS } from "@/lib/meal-types";
import { INTELLIGENCE_ACTIONS } from "@/lib/intelligence/actions";
import type { MealType } from "@prisma/client";
import {
  CALORIES_WARN_KCAL,
  PROTEIN_DONE_G,
  PROTEIN_WARN_G,
  confidenceFromData,
  findMatchingSavedMeals,
  goalGuidance,
  macroStatus,
  mealTimingFromHour,
  mealTimingLabel,
} from "@/lib/intelligence/nutrition-performance/analyze";
import type { NutritionPerformanceLoadResult } from "@/lib/intelligence/nutrition-performance/load-context";
import type {
  MacroSnapshot,
  MealRecommendation,
  NutritionPerformanceIntelligence,
  NutritionRecommendationState,
  TodayMealSummary,
} from "@/lib/intelligence/nutrition-performance/types";

function buildMacroSnapshot(
  target: number | null,
  consumed: number | null,
  remaining: number | null,
  kind: "protein" | "calories" | "carbs" | "fat"
): MacroSnapshot {
  return {
    target,
    consumed,
    remaining,
    status: macroStatus(target, consumed, remaining, kind),
  };
}

function buildTodayMeals(
  loaded: NutritionPerformanceLoadResult
): TodayMealSummary[] {
  if (!loaded.dashboard) return [];
  return loaded.dashboard.mealsByType
    .filter((slot) => slot.items.length > 0)
    .map((slot) => ({
      mealType: slot.mealType,
      label: MEAL_TYPE_LABELS[slot.mealType as MealType] ?? slot.mealType,
      calories: Math.round(slot.totals.calories),
      proteinG: Math.round(slot.totals.proteinG),
      carbsG: Math.round(slot.totals.carbsG),
      fatG: Math.round(slot.totals.fatG),
      itemCount: slot.items.length,
    }));
}

function resolveRecommendationState(options: {
  protein: MacroSnapshot;
  calories: MacroSnapshot;
  carbs: MacroSnapshot;
  fat: MacroSnapshot;
  mealCount: number;
  hour: number;
  weeklyProteinRatio: number | null;
  weeklyStatus: string | null;
  hasTargets: boolean;
}): NutritionRecommendationState {
  if (!options.hasTargets) return "insufficient_data";

  if (
    options.mealCount === 0 &&
    options.protein.consumed === 0 &&
    options.calories.consumed === 0
  ) {
    return "tracking_low";
  }

  const proteinMet = options.protein.status === "on_target" || options.protein.status === "over_target";
  const caloriesMet = options.calories.status === "on_target";
  const carbsLow = options.carbs.status === "under_target";
  const fatLow = options.fat.status === "under_target";

  if (proteinMet && caloriesMet && options.carbs.status !== "under_target" && options.fat.status !== "under_target") {
    return "no_action_needed";
  }

  if (proteinMet && (carbsLow || fatLow) && options.protein.remaining != null && options.protein.remaining <= PROTEIN_DONE_G) {
    return "macro_balance";
  }

  if (options.protein.status === "under_target") {
    return "protein_priority";
  }

  if (
    options.calories.status === "under_target" &&
    options.hour >= 17 &&
    (options.calories.remaining ?? 0) > CALORIES_WARN_KCAL
  ) {
    return "calorie_priority";
  }

  if (options.calories.status === "over_target" || options.protein.status === "over_target") {
    return "needs_attention";
  }

  if (
    options.weeklyProteinRatio != null &&
    options.weeklyProteinRatio < 0.55 &&
    options.weeklyStatus === "needs_attention"
  ) {
    return "needs_attention";
  }

  if (options.protein.status === "on_target" && options.calories.status === "on_target") {
    return "on_track";
  }

  return "needs_attention";
}

function buildExplanation(
  state: NutritionRecommendationState,
  loaded: NutritionPerformanceLoadResult,
  protein: MacroSnapshot,
  calories: MacroSnapshot,
  carbs: MacroSnapshot,
  primary: MealRecommendation | null,
  weeklyLine: string | null
): { explanation: string; evidence: string[] } {
  const evidence: string[] = [];
  const timing = mealTimingLabel(mealTimingFromHour(loaded.now.getHours()));

  if (protein.remaining != null && protein.target) {
    evidence.push(`Protein: ${protein.consumed ?? 0}/${protein.target} g (${protein.remaining} g offen)`);
  }
  if (calories.remaining != null && calories.target) {
    evidence.push(`Kalorien: ${calories.consumed ?? 0}/${calories.target} kcal (${calories.remaining} kcal offen)`);
  }
  if (carbs.remaining != null && carbs.target) {
    evidence.push(`KH: ${carbs.consumed ?? 0}/${carbs.target} g (${carbs.remaining} g offen)`);
  }
  evidence.push(`Tageszeit: ${timing}`);
  if (weeklyLine) evidence.push(weeklyLine);

  const goal = goalGuidance(loaded.nutritionGoal);

  switch (state) {
    case "no_action_needed":
    case "on_track":
      return {
        explanation: "Ernährung heute im Plan — kein Eingriff notwendig.",
        evidence,
      };
    case "insufficient_data":
      return {
        explanation: "Für heute liegen keine ausreichenden Ernährungsziele oder Daten vor.",
        evidence,
      };
    case "tracking_low":
      return {
        explanation: "Heute noch keine Mahlzeiten erfasst — Tracking starten für konkrete Empfehlungen.",
        evidence,
      };
    case "macro_balance":
      return {
        explanation: `Protein ist erreicht (${protein.consumed ?? 0}/${protein.target} g). Nächste Mahlzeit kann stärker auf KH/Fett ausgerichtet sein${carbs.remaining != null ? ` (noch ${carbs.remaining} g KH)` : ""}.`,
        evidence,
      };
    case "protein_priority": {
      let explanation = `Dir fehlen heute noch ${protein.remaining ?? "?"} g Protein${calories.remaining != null ? ` und ${calories.remaining} kcal` : ""}.`;
      if (primary) {
        explanation += ` „${primary.name}" liefert ${primary.protein} g Protein und ${primary.calories} kcal`;
        if (primary.remainingAfter?.proteinG != null) {
          explanation += ` — danach ca. ${primary.remainingAfter.proteinG} g Protein offen`;
        }
        explanation += ".";
      } else if (goal.prioritizeProtein) {
        explanation += " Eine proteinreiche Mahlzeit wäre sinnvoll.";
      }
      return { explanation, evidence };
    }
    case "calorie_priority":
      return {
        explanation: `Am Abend noch ${calories.remaining ?? "?"} kcal offen — eine normale Mahlzeit kann das Tagesziel sinnvoll ergänzen${goal.restrictCalories ? ", ohne das Ziel zu sprengen" : ""}.`,
        evidence,
      };
    case "needs_attention":
      if (calories.status === "over_target") {
        return {
          explanation: `Du liegst ${Math.abs(calories.remaining ?? 0)} kcal über dem Tagesziel — nächste Mahlzeit eher moderat wählen.`,
          evidence,
        };
      }
      return {
        explanation: primary?.reason
          ? `Ernährung braucht Aufmerksamkeit. ${primary.reason}`
          : "Ernährung heute nicht im Ziel — nächste Mahlzeit bewusst wählen.",
        evidence,
      };
    default:
      return { explanation: "Ernährungsstatus prüfen.", evidence };
  }
}

export function buildNutritionPerformanceIntelligence(
  loaded: NutritionPerformanceLoadResult
): NutritionPerformanceIntelligence {
  const d = loaded.dashboard;
  const t = d?.targets;
  const c = d?.consumed;
  const r = d?.remaining;

  const hasTargets = Boolean(t && t.calories > 0 && t.proteinG > 0);

  const calories = buildMacroSnapshot(
    t?.calories ?? null,
    c ? Math.round(c.calories) : null,
    r ? Math.round(r.calories) : null,
    "calories"
  );
  const protein = buildMacroSnapshot(
    t?.proteinG ?? null,
    c ? Math.round(c.proteinG) : null,
    r ? Math.round(r.proteinG) : null,
    "protein"
  );
  const carbs = buildMacroSnapshot(
    t?.carbsG ?? null,
    c ? Math.round(c.carbsG) : null,
    r ? Math.round(r.carbsG) : null,
    "carbs"
  );
  const fat = buildMacroSnapshot(
    t?.fatG ?? null,
    c ? Math.round(c.fatG) : null,
    r ? Math.round(r.fatG) : null,
    "fat"
  );

  const todayMeals = buildTodayMeals(loaded);
  const mealTiming = mealTimingFromHour(loaded.now.getHours());

  const weekly = loaded.weeklyNutrition;
  const weeklyProteinRatio =
    weekly && weekly.proteinDaysTotal >= 3
      ? weekly.proteinDaysOnTarget / weekly.proteinDaysTotal
      : null;
  const weeklyLine =
    weekly && weekly.proteinDaysTotal >= 3
      ? `Protein diese Woche: ${weekly.proteinDaysOnTarget}/${weekly.proteinDaysTotal} Tage im Ziel`
      : null;

  const state = resolveRecommendationState({
    protein,
    calories,
    carbs,
    fat,
    mealCount: todayMeals.length,
    hour: loaded.now.getHours(),
    weeklyProteinRatio,
    weeklyStatus: weekly?.status ?? null,
    hasTargets,
  });

  const proteinPriority =
    state === "protein_priority" ||
    (protein.status === "under_target" && (protein.remaining ?? 0) > PROTEIN_DONE_G);
  const caloriePriority = state === "calorie_priority";
  const macroBalanceMode = state === "macro_balance";

  const mealMatches = findMatchingSavedMeals(loaded.savedMeals, {
    proteinRemainingG: protein.remaining,
    caloriesRemainingKcal: calories.remaining,
    proteinPriority,
    caloriePriority,
    macroBalanceMode,
    maxResults: 3,
  });

  const mealRecs: MealRecommendation[] = mealMatches.map((match, idx) => ({
    id: `nutrition-meal-${match.meal.id}`,
    mealId: match.meal.id,
    name: match.meal.name,
    calories: match.meal.macros.perServing.calories,
    protein: match.meal.macros.perServing.proteinG,
    carbs: match.meal.macros.perServing.carbsG,
    fat: match.meal.macros.perServing.fatG,
    reason: `Passt ungefähr zu deinem verbleibenden Bedarf (${match.reason}).`,
    fitScore: match.fitScore,
    confidence: match.fitScore >= 0.5 ? "high" : "medium",
    action: INTELLIGENCE_ACTIONS.savedMeals,
    remainingAfter: match.remainingAfter,
  }));

  const primary = mealRecs[0] ?? null;
  const secondary = mealRecs.slice(1, 3);

  const confidence = confidenceFromData({
    hasTargets,
    hasMeals: todayMeals.length > 0,
    hasRemaining: protein.remaining != null || calories.remaining != null,
  });

  const { explanation, evidence } = buildExplanation(
    state,
    loaded,
    protein,
    calories,
    carbs,
    primary,
    weeklyLine
  );

  const items = [
    {
      title: "Ernährung heute",
      explanation,
      evidence: evidence.slice(0, 4),
      confidence,
      requiresConfirmation: false,
    },
    ...(primary
      ? [
          {
            title: primary.name,
            explanation: primary.reason,
            evidence: [
              `${primary.calories} kcal, ${primary.protein} g Protein pro Portion`,
              ...(primary.remainingAfter
                ? [
                    `Danach ca. ${primary.remainingAfter.proteinG ?? "?"} g Protein / ${primary.remainingAfter.calories ?? "?"} kcal offen`,
                  ]
                : []),
            ],
            confidence: primary.confidence,
            requiresConfirmation: false,
          },
        ]
      : []),
  ];

  return {
    generatedAt: loaded.now.toISOString(),
    mealTiming,
    mealTimingLabel: mealTimingLabel(mealTiming),
    nutritionGoal: loaded.nutritionGoal,
    mealCount: todayMeals.length,
    calories,
    protein,
    carbs,
    fat,
    waterMl: {
      consumed: d?.water.consumedMl ?? null,
      target: d?.water.targetMl ?? null,
    },
    todayMeals,
    recommendationState: state,
    confidence,
    primary,
    secondary,
    weeklyProteinDays: weeklyLine,
    weeklyNutritionStatus: weekly?.status ?? null,
    explanation,
    evidence,
    coachContext: {
      summary: explanation,
      items,
    },
  };
}

export function formatNutritionPerformanceForCoach(
  intel: NutritionPerformanceIntelligence,
  compact = false
): string[] {
  const lines: string[] = [];

  if (intel.calories.target != null) {
    lines.push(
      `Kalorien: ${intel.calories.consumed ?? 0}/${intel.calories.target} kcal (offen: ${intel.calories.remaining ?? "?"}) [${intel.calories.status}]`
    );
  }
  if (intel.protein.target != null) {
    lines.push(
      `Protein: ${intel.protein.consumed ?? 0}/${intel.protein.target} g (offen: ${intel.protein.remaining ?? "?"}) [${intel.protein.status}]`
    );
  }
  if (!compact) {
    lines.push(
      `KH: ${intel.carbs.consumed ?? "?"}/${intel.carbs.target ?? "?"} g [${intel.carbs.status}]`,
      `Fett: ${intel.fat.consumed ?? "?"}/${intel.fat.target ?? "?"} g [${intel.fat.status}]`,
      `Tageszeit: ${intel.mealTimingLabel}`,
      `Status: ${intel.recommendationState}`
    );
    for (const meal of intel.todayMeals) {
      lines.push(
        `${meal.label}: ${meal.calories} kcal / ${meal.proteinG} g Protein`
      );
    }
  }

  if (intel.weeklyProteinDays) {
    lines.push(intel.weeklyProteinDays);
  }

  lines.push(`Empfehlung: ${intel.explanation}`);

  if (intel.primary) {
    lines.push(
      `Saved Meal: ${intel.primary.name} — ${intel.primary.calories} kcal, ${intel.primary.protein} g Protein (Fit ${intel.primary.fitScore})`
    );
    if (intel.primary.remainingAfter) {
      lines.push(
        `Nach dieser Mahlzeit ca.: ${intel.primary.remainingAfter.proteinG ?? "?"} g Protein, ${intel.primary.remainingAfter.calories ?? "?"} kcal offen`
      );
    }
  } else if (intel.recommendationState === "protein_priority") {
    lines.push("Saved Meals: keine passende vorhanden");
  }

  return lines;
}
