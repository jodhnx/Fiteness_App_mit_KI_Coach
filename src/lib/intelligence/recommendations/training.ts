import { INTELLIGENCE_ACTIONS } from "@/lib/intelligence/actions";
import type { AdaptiveRecommendationContext } from "@/lib/intelligence/recommendations/context";
import type { AdaptiveRecommendation } from "@/lib/intelligence/recommendations/types";

export function collectTrainingAdaptations(
  ctx: AdaptiveRecommendationContext
): AdaptiveRecommendation[] {
  const recs: AdaptiveRecommendation[] = [];
  const weekly = ctx.weekly;
  if (!weekly) return recs;

  const { completed, planned, status, streakDays } = weekly.training;

  if (planned != null && planned > 0 && completed >= planned) {
    recs.push({
      id: "adapt-training-on-plan",
      type: "training",
      priority: "secondary",
      title: "Training im Plan",
      explanation: `Du hast diese Woche ${completed}/${planned} Trainings abgeschlossen. Deine aktuelle Frequenz scheint gut zu funktionieren.`,
      evidence: [`${completed} von ${planned} geplanten Trainings abgeschlossen.`],
      action: INTELLIGENCE_ACTIONS.training,
      confidence: "high",
      requiresConfirmation: false,
    });
    return recs;
  }

  if (
    planned != null &&
    planned > 0 &&
    status === "needs_attention" &&
    completed < planned
  ) {
    const missed = planned - completed;
    recs.push({
      id: "adapt-training-missed",
      type: "planning",
      priority: "primary",
      title: "Trainingsplan",
      explanation: `Du hast diese Woche ${completed} von ${planned} geplanten Trainings abgeschlossen. Eine Anpassung der Trainingstage könnte sinnvoll sein — ohne deinen Plan automatisch zu ändern.`,
      evidence: [
        `${completed} von ${planned} geplanten Trainings abgeschlossen.`,
        `${missed} Einheit${missed === 1 ? "" : "en"} offen.`,
      ],
      action: INTELLIGENCE_ACTIONS.editPlan,
      confidence: planned >= 3 ? "high" : "medium",
      requiresConfirmation: true,
    });
  } else if (planned != null && planned > 0 && completed < planned * 0.6) {
    recs.push({
      id: "adapt-training-plan-soon",
      type: "planning",
      priority: "primary",
      title: "Training einplanen",
      explanation: `Plane die nächsten ${planned - completed} Einheit${planned - completed === 1 ? "" : "en"} früher in der Woche.`,
      evidence: [`${completed} von ${planned} geplanten Trainings abgeschlossen.`],
      action: INTELLIGENCE_ACTIONS.training,
      confidence: "medium",
      requiresConfirmation: false,
    });
  }

  if (
    (ctx.workoutDaysPerWeek ?? planned ?? 0) >= 3 &&
    completed < 2 &&
    (planned == null || planned <= 0)
  ) {
    recs.push({
      id: "adapt-training-frequency-low",
      type: "training",
      priority: "secondary",
      title: "Trainingsfrequenz",
      explanation: "Deine Trainingsfrequenz war diese Woche niedrig. Ein kurzes Workout kann helfen, wieder in den Rhythmus zu kommen.",
      evidence: [`${completed} Training${completed === 1 ? "" : "s"} diese Woche.`],
      action: INTELLIGENCE_ACTIONS.quickWorkout,
      confidence: "medium",
      requiresConfirmation: false,
    });
  }

  if (streakDays >= 5) {
    recs.push({
      id: "adapt-training-streak",
      type: "consistency",
      priority: "secondary",
      title: "Training-Streak",
      explanation: `${streakDays} Trainingstage in Folge — starke Konsistenz.`,
      evidence: [`${streakDays} Tage Training-Streak.`],
      action: INTELLIGENCE_ACTIONS.training,
      confidence: "high",
      requiresConfirmation: false,
    });
  }

  return recs;
}
