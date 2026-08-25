import type { IntelligenceContext } from "@/lib/intelligence/context";
import type {
  ActivityIntelligenceSnapshot,
  IntelligenceRecommendation,
  RecoveryIntelligenceSnapshot,
} from "@/lib/intelligence/types";
import { INTELLIGENCE_ACTIONS } from "@/lib/intelligence/actions";

export function buildRecoverySnapshot(
  ctx: IntelligenceContext
): RecoveryIntelligenceSnapshot {
  return {
    steps: ctx.steps,
    stepGoal: ctx.stepGoal,
    sleepHours: ctx.sleepHours,
    recoveryScore: ctx.recoveryScore,
  };
}

export function buildActivitySnapshot(
  ctx: IntelligenceContext
): ActivityIntelligenceSnapshot {
  return {
    workoutsThisWeek: ctx.workoutsThisWeek,
  };
}

export function collectRecoveryRecommendations(
  ctx: IntelligenceContext
): IntelligenceRecommendation[] {
  const recs: IntelligenceRecommendation[] = [];

  if (ctx.recoveryScore != null && ctx.recoveryScore < 50) {
    recs.push({
      id: "recovery-low",
      type: "recovery",
      priority: "secondary",
      title: "Regeneration",
      description: `Regeneration bei ${Math.round(ctx.recoveryScore)} % — heute eher leicht trainieren oder Pause.`,
      values: { recoveryScore: ctx.recoveryScore },
      action: INTELLIGENCE_ACTIONS.training,
    });
  }

  if (
    ctx.sleepHours != null &&
    ctx.sleepHours < 6 &&
    ctx.now.getHours() >= 12
  ) {
    recs.push({
      id: "recovery-sleep",
      type: "recovery",
      priority: "secondary",
      title: "Schlaf",
      description: `Nur ${ctx.sleepHours.toFixed(1)} h Schlaf — Intensität heute reduzieren.`,
      values: { sleepHours: ctx.sleepHours },
      action: INTELLIGENCE_ACTIONS.coach,
    });
  }

  return recs;
}

export function collectActivityRecommendations(
  ctx: IntelligenceContext
): IntelligenceRecommendation[] {
  const recs: IntelligenceRecommendation[] = [];

  if (
    ctx.steps != null &&
    ctx.stepGoal != null &&
    ctx.stepGoal > 0 &&
    ctx.steps < ctx.stepGoal * 0.5 &&
    ctx.now.getHours() >= 18
  ) {
    const left = ctx.stepGoal - ctx.steps;
    recs.push({
      id: "activity-steps",
      type: "activity",
      priority: "secondary",
      title: "Schritte",
      description: `Noch ${left.toLocaleString("de-DE")} Schritte bis zum Tagesziel.`,
      values: { stepsRemaining: left },
      action: INTELLIGENCE_ACTIONS.progress,
    });
  }

  return recs;
}
