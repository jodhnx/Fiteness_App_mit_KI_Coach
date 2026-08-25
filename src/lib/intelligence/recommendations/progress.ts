import { INTELLIGENCE_ACTIONS } from "@/lib/intelligence/actions";
import type { AdaptiveRecommendationContext } from "@/lib/intelligence/recommendations/context";
import type { AdaptiveRecommendation } from "@/lib/intelligence/recommendations/types";

export function collectProgressAdaptations(
  ctx: AdaptiveRecommendationContext
): AdaptiveRecommendation[] {
  const recs: AdaptiveRecommendation[] = [];
  const daily = ctx.daily;
  const weekly = ctx.weekly;

  const prs = weekly?.progress.prsThisWeek ?? [];
  const improvement =
    weekly?.progress.topImprovement ?? daily?.progress.sessionImprovement ?? null;

  if (prs.length > 0) {
    const names = prs.slice(0, 2).map((p) => p.exerciseName).join(", ");
    recs.push({
      id: "adapt-progress-pr",
      type: "progress",
      priority: "secondary",
      title: "Neue Rekorde",
      explanation: "Deine Performance steigt aktuell. Behalte den bestehenden Plan bei.",
      evidence: prs.map(
        (p) => `${p.exerciseName}: ${p.valueKg} kg (${new Date(p.achievedAt).toLocaleDateString("de-DE")}).`
      ),
      action: INTELLIGENCE_ACTIONS.records,
      confidence: "high",
      requiresConfirmation: false,
    });
    if (prs.length === 1) {
      recs[recs.length - 1]!.evidence.unshift(`Neuer PR: ${names}.`);
    }
  }

  if (improvement && prs.length === 0) {
    recs.push({
      id: "adapt-progress-improving",
      type: "progress",
      priority: "secondary",
      title: "Fortschritt",
      explanation: `Deine Performance bei ${improvement.exerciseName} verbessert sich. Behalte den bestehenden Plan bei.`,
      evidence: [`${improvement.exerciseName}: ${improvement.detail}.`],
      action: INTELLIGENCE_ACTIONS.progress,
      confidence: "medium",
      requiresConfirmation: false,
    });
  }

  return recs;
}
