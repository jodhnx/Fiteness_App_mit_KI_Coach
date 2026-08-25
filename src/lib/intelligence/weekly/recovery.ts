import { INTELLIGENCE_ACTIONS } from "@/lib/intelligence/actions";
import type { IntelligenceRecommendation } from "@/lib/intelligence/types";
import type { WeeklyIntelligenceContext } from "@/lib/intelligence/weekly/context";
import type { WeeklyRecoverySnapshot } from "@/lib/intelligence/weekly/types";

const MIN_SLEEP_NIGHTS = 3;

export function buildWeeklyRecoverySnapshot(
  ctx: WeeklyIntelligenceContext
): WeeklyRecoverySnapshot {
  const r = ctx.weeklyReport;
  const daysWithSteps = r.totalSteps > 0 ? 7 : 0;
  const avgSteps =
    daysWithSteps > 0 ? Math.round(r.totalSteps / Math.max(1, daysWithSteps)) : null;

  let status: WeeklyRecoverySnapshot["status"] = "insufficient_data";
  if (r.sleepNightsLogged >= MIN_SLEEP_NIGHTS) {
    status =
      r.avgSleepHours != null && r.avgSleepHours >= 7
        ? "good"
        : r.avgSleepHours != null && r.avgSleepHours < 6.5
          ? "needs_attention"
          : "neutral";
  } else if (r.totalSteps > 20000) {
    status = "good";
  }

  return {
    avgStepsPerDay: avgSteps,
    avgSleepHours: r.avgSleepHours,
    activityCount: r.activityCount,
    status,
  };
}

export function collectWeeklyRecoveryInsights(
  snap: WeeklyRecoverySnapshot
): IntelligenceRecommendation[] {
  const recs: IntelligenceRecommendation[] = [];

  if (snap.avgSleepHours != null && snap.avgSleepHours < 6.5) {
    recs.push({
      id: "weekly-sleep-low",
      type: "recovery",
      priority: "secondary",
      title: "Schlaf",
      description: `Durchschnittlich ${snap.avgSleepHours.toFixed(1)} h Schlaf — Regeneration beachten.`,
      values: { avgSleepHours: snap.avgSleepHours },
      action: INTELLIGENCE_ACTIONS.coach,
    });
  }

  if (snap.avgStepsPerDay != null && snap.avgStepsPerDay >= 8000) {
    recs.push({
      id: "weekly-steps-good",
      type: "activity",
      priority: "secondary",
      title: "Aktivität",
      description: `Ø ${snap.avgStepsPerDay.toLocaleString("de-DE")} Schritte pro Tag.`,
      values: { avgSteps: snap.avgStepsPerDay },
      action: INTELLIGENCE_ACTIONS.progress,
    });
  }

  return recs;
}
