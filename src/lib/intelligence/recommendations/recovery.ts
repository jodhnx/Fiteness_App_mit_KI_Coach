import { INTELLIGENCE_ACTIONS } from "@/lib/intelligence/actions";
import type { AdaptiveRecommendationContext } from "@/lib/intelligence/recommendations/context";
import type { AdaptiveRecommendation } from "@/lib/intelligence/recommendations/types";

export function collectRecoveryAdaptations(
  ctx: AdaptiveRecommendationContext
): AdaptiveRecommendation[] {
  const recs: AdaptiveRecommendation[] = [];
  const daily = ctx.daily;
  const weekly = ctx.weekly;

  const sleepWeek = weekly?.recovery.avgSleepHours;
  const sleepToday = daily?.recovery.sleepHours;
  const recoveryScore = daily?.recovery.recoveryScore;

  if (sleepWeek != null && sleepWeek < 6.5 && weekly!.recovery.status === "needs_attention") {
    recs.push({
      id: "adapt-recovery-sleep-week",
      type: "recovery",
      priority: "secondary",
      title: "Schlaf",
      explanation:
        "Deine Recovery war an mehreren Tagen niedrig. Beobachte deine Erholung, bevor du das Trainingsvolumen weiter erhöhst.",
      evidence: [`Durchschnittlich ${sleepWeek.toFixed(1)} h Schlaf diese Woche.`],
      action: INTELLIGENCE_ACTIONS.coach,
      confidence: "medium",
      requiresConfirmation: false,
    });
  }

  if (sleepToday != null && sleepToday < 6 && recoveryScore != null && recoveryScore < 50) {
    recs.push({
      id: "adapt-recovery-today",
      type: "recovery",
      priority: "secondary",
      title: "Erholung heute",
      explanation:
        "Schlaf und Recovery-Werte sind heute niedrig. Keine automatische Trainingsreduzierung — achte auf Erholung.",
      evidence: [
        `Schlaf: ${sleepToday.toFixed(1)} h.`,
        `Recovery-Score: ${recoveryScore}%.`,
      ],
      action: INTELLIGENCE_ACTIONS.coach,
      confidence: "medium",
      requiresConfirmation: false,
    });
  }

  return recs;
}
