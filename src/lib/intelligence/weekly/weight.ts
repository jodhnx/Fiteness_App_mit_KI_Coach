import { INTELLIGENCE_ACTIONS } from "@/lib/intelligence/actions";
import type { IntelligenceRecommendation } from "@/lib/intelligence/types";
import type { WeeklyIntelligenceContext } from "@/lib/intelligence/weekly/context";
import type { WeeklyWeightSnapshot } from "@/lib/intelligence/weekly/types";

function weightStatus(
  changeKg: number | null,
  nutritionGoal: string | null
): WeeklyWeightSnapshot["status"] {
  if (changeKg == null) return "insufficient_data";
  if (nutritionGoal === "FAT_LOSS" && changeKg <= -0.2) return "on_track";
  if (nutritionGoal === "MUSCLE_GAIN" && changeKg >= 0.2) return "on_track";
  if (Math.abs(changeKg) < 0.15) return "neutral";
  if (nutritionGoal === "FAT_LOSS" && changeKg > 0.3) return "needs_attention";
  return "good";
}

export function buildWeeklyWeightSnapshot(
  ctx: WeeklyIntelligenceContext
): WeeklyWeightSnapshot {
  const changeKg = ctx.weeklyReport.weightChangeKg;
  let trendLabel: WeeklyWeightSnapshot["trendLabel"] = "insufficient_data";
  if (changeKg != null) {
    if (Math.abs(changeKg) < 0.15) trendLabel = "stable";
    else if (changeKg < 0) trendLabel = "down";
    else trendLabel = "up";
  }

  return {
    changeKg,
    currentKg: ctx.currentWeightKg,
    status: weightStatus(changeKg, ctx.nutritionGoal),
    trendLabel,
  };
}

export function collectWeeklyWeightInsights(
  ctx: WeeklyIntelligenceContext,
  snap: WeeklyWeightSnapshot
): IntelligenceRecommendation[] {
  const recs: IntelligenceRecommendation[] = [];
  if (snap.changeKg == null) return recs;

  const d = snap.changeKg;
  if (snap.status === "on_track") {
    recs.push({
      id: "weekly-weight-on-track",
      type: "weight",
      priority: "secondary",
      title: "Gewicht",
      description: `Gewicht entwickelt sich Richtung Ziel (${d > 0 ? "+" : ""}${d.toFixed(1)} kg diese Woche).`,
      values: { changeKg: d },
      action: INTELLIGENCE_ACTIONS.progress,
    });
  } else if (snap.trendLabel === "stable") {
    recs.push({
      id: "weekly-weight-stable",
      type: "weight",
      priority: "secondary",
      title: "Gewicht",
      description: "Gewicht diese Woche stabil — weiter konstant tracken.",
      action: INTELLIGENCE_ACTIONS.progress,
    });
  } else if (Math.abs(d) >= 0.2) {
    recs.push({
      id: "weekly-weight-change",
      type: "weight",
      priority: "secondary",
      title: "Gewicht",
      description: `Veränderung diese Woche: ${d > 0 ? "+" : ""}${d.toFixed(1)} kg.`,
      values: { changeKg: d },
      action: INTELLIGENCE_ACTIONS.progress,
    });
  }

  return recs;
}
