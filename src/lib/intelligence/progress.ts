import { subDays } from "date-fns";
import type { IntelligenceContext } from "@/lib/intelligence/context";
import type {
  IntelligenceRecommendation,
  ProgressIntelligenceSnapshot,
} from "@/lib/intelligence/types";
import { INTELLIGENCE_ACTIONS } from "@/lib/intelligence/actions";

const PR_FRESH_DAYS = 3;

export function buildProgressSnapshot(
  ctx: IntelligenceContext
): ProgressIntelligenceSnapshot {
  const pr =
    ctx.recentPr &&
    ctx.recentPr.achievedAt >= subDays(ctx.now, PR_FRESH_DAYS)
      ? {
          exerciseName: ctx.recentPr.exerciseName,
          valueKg: ctx.recentPr.weightKg ?? ctx.recentPr.value,
          achievedAt: ctx.recentPr.achievedAt.toISOString(),
        }
      : null;

  return {
    recentPr: pr,
    sessionImprovement: ctx.sessionImprovement,
  };
}

export function collectProgressRecommendations(
  ctx: IntelligenceContext,
  snapshot: ProgressIntelligenceSnapshot
): IntelligenceRecommendation[] {
  const recs: IntelligenceRecommendation[] = [];

  if (snapshot.recentPr) {
    recs.push({
      id: "progress-pr",
      type: "achievement",
      priority: "primary",
      title: "Neuer Rekord",
      description: `Neuer PR bei ${snapshot.recentPr.exerciseName}: ${snapshot.recentPr.valueKg} kg.`,
      values: { weightKg: snapshot.recentPr.valueKg },
      action: INTELLIGENCE_ACTIONS.records,
    });
  }

  if (snapshot.sessionImprovement) {
    recs.push({
      id: "progress-session",
      type: "progress",
      priority: "secondary",
      title: "Fortschritt",
      description: `${snapshot.sessionImprovement.exerciseName}: ${snapshot.sessionImprovement.detail}`,
      action: INTELLIGENCE_ACTIONS.progress,
    });
  }

  return recs;
}
