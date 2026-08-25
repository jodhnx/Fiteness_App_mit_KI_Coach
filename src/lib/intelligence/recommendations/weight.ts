import { INTELLIGENCE_ACTIONS } from "@/lib/intelligence/actions";
import type { AdaptiveRecommendationContext } from "@/lib/intelligence/recommendations/context";
import type { AdaptiveRecommendation } from "@/lib/intelligence/recommendations/types";

export function collectWeightAdaptations(
  ctx: AdaptiveRecommendationContext
): AdaptiveRecommendation[] {
  const recs: AdaptiveRecommendation[] = [];
  const daily = ctx.daily;
  const weekly = ctx.weekly;
  if (!daily && !weekly) return recs;

  const plateau = daily?.weight.plateauDetected ?? false;
  const trendLabel = daily?.weight.trendLabel ?? "insufficient_data";
  const weeklyStatus = weekly?.weight.status;
  const calorieDelta = weekly?.nutrition.calorieDeltaVsTarget ?? null;
  const trainingStatus = weekly?.training.status;
  const proteinOk =
    weekly != null &&
    weekly.nutrition.proteinDaysTotal >= 3 &&
    weekly.nutrition.proteinDaysOnTarget / weekly.nutrition.proteinDaysTotal >= 0.7;

  if (weeklyStatus === "on_track" || weeklyStatus === "good") {
    recs.push({
      id: "adapt-weight-on-track",
      type: "goal",
      priority: "secondary",
      title: "Gewicht im Plan",
      explanation: "Dein Gewicht entwickelt sich Richtung Ziel — kein Eingriff notwendig.",
      evidence: [
        weekly?.weight.changeKg != null
          ? `Veränderung diese Woche: ${weekly.weight.changeKg > 0 ? "+" : ""}${weekly.weight.changeKg} kg.`
          : "Gewichtstrend passt zum Ziel.",
      ],
      action: INTELLIGENCE_ACTIONS.progress,
      confidence: weekly?.weight.changeKg != null ? "high" : "medium",
      requiresConfirmation: false,
    });
  }

  if (plateau && trendLabel !== "insufficient_data") {
    const evidence: string[] = ["Gewicht über 14 Tage nahezu unverändert."];

    if (calorieDelta != null && calorieDelta > 120) {
      evidence.push(
        `Kalorien durchschnittlich ${Math.abs(calorieDelta)} kcal über Ziel diese Woche.`
      );
    }
    if (trainingStatus === "good") {
      evidence.push("Training diese Woche konstant.");
    }

    const hasCrossPattern =
      calorieDelta != null &&
      Math.abs(calorieDelta) > 120 &&
      trainingStatus === "good";

    if (hasCrossPattern) {
      recs.push({
        id: "adapt-weight-plateau-nutrition",
        type: "weight",
        priority: "primary",
        title: "Gewicht stagniert",
        explanation:
          "Dein Gewicht bewegt sich kaum, während Kalorien wiederholt vom Ziel abweichen. Ernährungskonsistenz könnte der nächste Hebel sein — ohne automatische Zieländerung.",
        evidence,
        action: INTELLIGENCE_ACTIONS.nutrition,
        confidence: evidence.length >= 3 ? "high" : "medium",
        requiresConfirmation: false,
      });

      recs.push({
        id: "adapt-weight-calorie-review",
        type: "goal",
        priority: "secondary",
        title: "Kalorienziel prüfen",
        explanation:
          "Falls das Plateau anhält, könnte eine Anpassung deines Kalorienziels sinnvoll sein — nur nach deiner Bestätigung.",
        evidence: [...evidence, "Empfehlung betrifft Nutzereinstellungen."],
        action: INTELLIGENCE_ACTIONS.nutritionGoals,
        confidence: "medium",
        requiresConfirmation: true,
      });
    } else if (proteinOk && trainingStatus === "good") {
      recs.push({
        id: "adapt-weight-plateau-wait",
        type: "weight",
        priority: "secondary",
        title: "Gewicht stabil",
        explanation:
          "Gewicht stagniert kurz, aber Training und Protein sind stabil — noch keine voreilige Änderung empfohlen.",
        evidence,
        action: INTELLIGENCE_ACTIONS.progress,
        confidence: "low",
        requiresConfirmation: false,
      });
    } else {
      recs.push({
        id: "adapt-weight-plateau-soft",
        type: "weight",
        priority: "secondary",
        title: "Gewicht beobachten",
        explanation:
          "Dein Gewicht bewegt sich seit längerem wenig. Tracke weiter und prüfe Kalorien sowie Protein.",
        evidence,
        action: INTELLIGENCE_ACTIONS.progress,
        confidence: "low",
        requiresConfirmation: false,
      });
    }
  } else if (plateau && trendLabel === "insufficient_data") {
    recs.push({
      id: "adapt-weight-insufficient",
      type: "weight",
      priority: "secondary",
      title: "Gewichtsdaten",
      explanation:
        "Zu wenige Gewichtsdaten für eine sichere Plateau-Einschätzung — weiter regelmäßig eintragen.",
      evidence: ["Weniger als ausreichend Einträge für einen 14-Tage-Trend."],
      action: INTELLIGENCE_ACTIONS.progress,
      confidence: "low",
      requiresConfirmation: false,
    });
  }

  return recs;
}
