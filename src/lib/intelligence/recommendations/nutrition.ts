import { INTELLIGENCE_ACTIONS } from "@/lib/intelligence/actions";
import type { AdaptiveRecommendationContext } from "@/lib/intelligence/recommendations/context";
import type { AdaptiveRecommendation } from "@/lib/intelligence/recommendations/types";

const MIN_TRACKED_DAYS = 3;

function confidenceFromDays(total: number, ratio: number): AdaptiveRecommendation["confidence"] {
  if (total >= 6 && ratio >= 0.5) return "high";
  if (total >= 4) return "medium";
  return "low";
}

export function collectNutritionAdaptations(
  ctx: AdaptiveRecommendationContext
): AdaptiveRecommendation[] {
  const recs: AdaptiveRecommendation[] = [];
  const weekly = ctx.weekly;
  if (!weekly || weekly.nutrition.proteinDaysTotal < MIN_TRACKED_DAYS) return recs;

  const { proteinDaysOnTarget, proteinDaysTotal, calorieDeltaVsTarget, status } =
    weekly.nutrition;
  const daysUnder = proteinDaysTotal - proteinDaysOnTarget;

  if (status === "insufficient_data") return recs;

  if (
    proteinDaysOnTarget < proteinDaysTotal &&
    daysUnder >= 3 &&
    status !== "good"
  ) {
    const ratio = daysUnder / proteinDaysTotal;
    recs.push({
      id: "adapt-protein-low-week",
      type: "nutrition",
      priority: daysUnder >= 4 ? "primary" : "secondary",
      title: "Protein-Konsistenz",
      explanation:
        "Dein Protein lag diese Woche an mehreren Tagen unter deinem Ziel. Eine proteinreichere Mahlzeit am Nachmittag könnte helfen.",
      evidence: [
        `Protein an ${proteinDaysOnTarget} von ${proteinDaysTotal} Tagen im Ziel.`,
        `${daysUnder} Tag${daysUnder === 1 ? "" : "e"} unter Ziel.`,
      ],
      action: INTELLIGENCE_ACTIONS.nutrition,
      confidence: confidenceFromDays(proteinDaysTotal, ratio),
      requiresConfirmation: false,
    });
  }

  if (
    calorieDeltaVsTarget != null &&
    calorieDeltaVsTarget > 150 &&
    status === "needs_attention"
  ) {
    recs.push({
      id: "adapt-calories-over",
      type: "nutrition",
      priority: "secondary",
      title: "Kalorien über Ziel",
      explanation:
        "Deine Kalorien lagen diese Woche wiederholt über deinem Ziel. Prüfe Snacks und Portionen — ohne dein Kalorienziel automatisch zu ändern.",
      evidence: [
        `Durchschnitt ${Math.abs(calorieDeltaVsTarget)} kcal über Kalorienziel diese Woche.`,
      ],
      action: INTELLIGENCE_ACTIONS.nutrition,
      confidence: proteinDaysTotal >= 5 ? "high" : "medium",
      requiresConfirmation: false,
    });
  }

  if (
    calorieDeltaVsTarget != null &&
    calorieDeltaVsTarget < -180 &&
    status === "needs_attention"
  ) {
    recs.push({
      id: "adapt-calories-under",
      type: "nutrition",
      priority: "secondary",
      title: "Kalorien unter Ziel",
      explanation:
        "Deine Kalorien lagen diese Woche wiederholt deutlich unter Ziel. Achte auf ausreichende Energie für Training und Erholung.",
      evidence: [
        `Durchschnitt ${Math.abs(calorieDeltaVsTarget)} kcal unter Kalorienziel diese Woche.`,
      ],
      action: INTELLIGENCE_ACTIONS.nutrition,
      confidence: proteinDaysTotal >= 5 ? "high" : "medium",
      requiresConfirmation: false,
    });
  }

  if (proteinDaysTotal < MIN_TRACKED_DAYS) {
    recs.push({
      id: "adapt-tracking-low",
      type: "consistency",
      priority: "secondary",
      title: "Tracking",
      explanation:
        "Wenige Ernährungstage erfasst — konsistentes Tracking hilft bei besseren Empfehlungen.",
      evidence: [`Nur ${proteinDaysTotal} Tag${proteinDaysTotal === 1 ? "" : "e"} mit Ernährungsdaten diese Woche.`],
      action: INTELLIGENCE_ACTIONS.nutrition,
      confidence: "low",
      requiresConfirmation: false,
    });
  }

  return recs;
}
