import type { IntelligenceContext } from "@/lib/intelligence/context";
import type {
  IntelligenceRecommendation,
  TrainingIntelligenceSnapshot,
} from "@/lib/intelligence/types";
import { INTELLIGENCE_ACTIONS } from "@/lib/intelligence/actions";

export function buildTrainingSnapshot(
  ctx: IntelligenceContext
): TrainingIntelligenceSnapshot {
  return {
    doneToday: ctx.trainingDoneToday,
    plannedToday: ctx.trainingPlanned,
    activeSession: ctx.activeSession,
    label: ctx.nextWorkoutLabel,
    streakDays: ctx.trainingStreakDays,
  };
}

export function collectTrainingRecommendations(
  ctx: IntelligenceContext
): IntelligenceRecommendation[] {
  const recs: IntelligenceRecommendation[] = [];

  if (ctx.activeSession) {
    return recs;
  }

  if (ctx.trainingDoneToday) {
    if (ctx.trainingStreakDays >= 3) {
      recs.push({
        id: "training-streak",
        type: "training",
        priority: "secondary",
        title: "Training",
        description: `${ctx.trainingStreakDays} Trainingstage in Folge — stark.`,
        values: { streakDays: ctx.trainingStreakDays },
        action: INTELLIGENCE_ACTIONS.training,
      });
    }
    return recs;
  }

  if (ctx.trainingPlanned || ctx.nextWorkoutLabel) {
    recs.push({
      id: "training-pending",
      type: "training",
      priority: "primary",
      title: "Training",
      description: ctx.nextWorkoutLabel
        ? `Dein Training steht heute noch aus: ${ctx.nextWorkoutLabel}.`
        : "Dein Training steht heute noch aus.",
      action: INTELLIGENCE_ACTIONS.training,
    });
    return recs;
  }

  return recs;
}
