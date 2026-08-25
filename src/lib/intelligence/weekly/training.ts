import { INTELLIGENCE_ACTIONS } from "@/lib/intelligence/actions";
import type { IntelligenceRecommendation } from "@/lib/intelligence/types";
import type { WeeklyIntelligenceContext } from "@/lib/intelligence/weekly/context";
import type { WeeklyTrainingSnapshot } from "@/lib/intelligence/weekly/types";

function trainingStatus(
  completed: number,
  planned: number | null
): WeeklyTrainingSnapshot["status"] {
  if (planned == null || planned <= 0) {
    return completed > 0 ? "good" : "insufficient_data";
  }
  const rate = completed / planned;
  if (rate >= 0.75) return "good";
  if (rate < 0.5) return "needs_attention";
  return "neutral";
}

export function buildWeeklyTrainingSnapshot(
  ctx: WeeklyIntelligenceContext
): WeeklyTrainingSnapshot {
  const completed = ctx.weeklyReport.workouts;
  const planned = ctx.plannedWorkoutsPerWeek;
  const completionRate =
    planned != null && planned > 0
      ? Math.round((completed / planned) * 100) / 100
      : null;

  return {
    completed,
    planned,
    completionRate,
    streakDays: ctx.trainingStreakDays,
    status: trainingStatus(completed, planned),
  };
}

export function collectWeeklyTrainingInsights(
  ctx: WeeklyIntelligenceContext,
  snap: WeeklyTrainingSnapshot
): IntelligenceRecommendation[] {
  const recs: IntelligenceRecommendation[] = [];
  const { completed, planned } = snap;

  if (planned != null && planned > 0) {
    recs.push({
      id: "weekly-training-completion",
      type: "training",
      priority: "primary",
      title: "Training",
      description: `${completed} von ${planned} geplanten Trainings abgeschlossen.`,
      values: { completed, planned },
      action: INTELLIGENCE_ACTIONS.training,
    });
  } else if (completed > 0) {
    recs.push({
      id: "weekly-training-count",
      type: "training",
      priority: "secondary",
      title: "Training",
      description: `${completed} Training${completed === 1 ? "" : "s"} diese Woche absolviert.`,
      values: { completed },
      action: INTELLIGENCE_ACTIONS.training,
    });
  }

  if (ctx.trainingStreakDays >= 3) {
    recs.push({
      id: "weekly-training-streak",
      type: "achievement",
      priority: "secondary",
      title: "Streak",
      description: `${ctx.trainingStreakDays} Trainingstage in Folge.`,
      values: { streakDays: ctx.trainingStreakDays },
      action: INTELLIGENCE_ACTIONS.training,
    });
  }

  if (
    snap.status === "needs_attention" &&
    planned != null &&
    completed < planned
  ) {
    recs.push({
      id: "weekly-training-plan",
      type: "training",
      priority: "secondary",
      title: "Empfehlung",
      description: `Plane die nächsten ${planned - completed} Einheit${planned - completed === 1 ? "" : "en"} früher in der Woche.`,
      action: INTELLIGENCE_ACTIONS.training,
    });
  }

  return recs;
}
