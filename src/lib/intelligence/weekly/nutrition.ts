import { INTELLIGENCE_ACTIONS } from "@/lib/intelligence/actions";
import type { IntelligenceRecommendation } from "@/lib/intelligence/types";
import type { WeeklyIntelligenceContext } from "@/lib/intelligence/weekly/context";
import type { WeeklyNutritionSnapshot } from "@/lib/intelligence/weekly/types";

const MIN_TRACKED_DAYS = 3;

function nutritionStatus(
  proteinDaysOnTarget: number,
  proteinDaysTotal: number,
  calorieDelta: number | null
): WeeklyNutritionSnapshot["status"] {
  if (proteinDaysTotal < MIN_TRACKED_DAYS) return "insufficient_data";
  const ratio = proteinDaysOnTarget / proteinDaysTotal;
  if (ratio >= 0.7) return "good";
  if (ratio < 0.45) return "needs_attention";
  if (calorieDelta != null && Math.abs(calorieDelta) > 250) return "needs_attention";
  return "neutral";
}

export function buildWeeklyNutritionSnapshot(
  ctx: WeeklyIntelligenceContext
): WeeklyNutritionSnapshot {
  const r = ctx.weeklyReport;
  const calorieTarget = ctx.calorieTarget;
  const calorieDelta =
    calorieTarget != null && r.avgCaloriesKcal > 0
      ? Math.round(r.avgCaloriesKcal - calorieTarget)
      : null;

  return {
    avgProteinG: r.proteinDaysTotal > 0 ? r.avgProteinG : null,
    avgCaloriesKcal: r.proteinDaysTotal > 0 ? r.avgCaloriesKcal : null,
    proteinDaysOnTarget: r.proteinDaysOnTarget,
    proteinDaysTotal: r.proteinDaysTotal,
    calorieTarget,
    calorieDeltaVsTarget: calorieDelta,
    status: nutritionStatus(
      r.proteinDaysOnTarget,
      r.proteinDaysTotal,
      calorieDelta
    ),
  };
}

export function collectWeeklyNutritionInsights(
  ctx: WeeklyIntelligenceContext,
  snap: WeeklyNutritionSnapshot
): IntelligenceRecommendation[] {
  const recs: IntelligenceRecommendation[] = [];
  if (snap.proteinDaysTotal < MIN_TRACKED_DAYS) return recs;

  recs.push({
    id: "weekly-protein-consistency",
    type: "nutrition",
    priority: snap.status === "good" ? "secondary" : "primary",
    title: "Protein",
    description: `Protein an ${snap.proteinDaysOnTarget} von ${snap.proteinDaysTotal} Tagen erreicht.`,
    values: {
      daysOnTarget: snap.proteinDaysOnTarget,
      daysTotal: snap.proteinDaysTotal,
    },
    action: INTELLIGENCE_ACTIONS.nutrition,
  });

  if (
    snap.calorieDeltaVsTarget != null &&
    Math.abs(snap.calorieDeltaVsTarget) >= 120
  ) {
    const d = snap.calorieDeltaVsTarget;
    recs.push({
      id: "weekly-calories-avg",
      type: "nutrition",
      priority: "secondary",
      title: "Kalorien",
      description:
        d < 0
          ? `Deine Kalorien lagen diese Woche durchschnittlich ${Math.abs(d)} kcal unter deinem Ziel.`
          : `Deine Kalorien lagen diese Woche durchschnittlich ${d} kcal über deinem Ziel.`,
      values: { deltaKcal: d },
      action: INTELLIGENCE_ACTIONS.nutrition,
    });
  }

  if (snap.status === "needs_attention" && snap.proteinDaysOnTarget < 4) {
    recs.push({
      id: "weekly-protein-rec",
      type: "nutrition",
      priority: "secondary",
      title: "Empfehlung",
      description:
        "Wenn du dein Ziel weiterverfolgen möchtest, halte deine Protein-Konsistenz bei.",
      action: INTELLIGENCE_ACTIONS.nutrition,
    });
  }

  return recs;
}
