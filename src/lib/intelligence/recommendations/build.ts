import type { AdaptiveRecommendationContext } from "@/lib/intelligence/recommendations/context";
import { collectNutritionAdaptations } from "@/lib/intelligence/recommendations/nutrition";
import { collectTrainingAdaptations } from "@/lib/intelligence/recommendations/training";
import { collectWeightAdaptations } from "@/lib/intelligence/recommendations/weight";
import { collectProgressAdaptations } from "@/lib/intelligence/recommendations/progress";
import { collectRecoveryAdaptations } from "@/lib/intelligence/recommendations/recovery";
import {
  findProteinRichSavedMeal,
  buildSavedMealRecommendation,
} from "@/lib/intelligence/recommendations/saved-meals";
import {
  prioritizeAdaptiveRecommendations,
  buildOnTrackRecommendation,
} from "@/lib/intelligence/recommendations/prioritize";
import type { AdaptiveRecommendations, AdaptiveRecommendation, AdaptiveRecommendationType } from "@/lib/intelligence/recommendations/types";
import type { CoachContextMode } from "@/lib/coach-actions";

function applyWeeklyConsistencyGuard(
  candidates: AdaptiveRecommendation[],
  ctx: AdaptiveRecommendationContext
): AdaptiveRecommendation[] {
  const w = ctx.weekly;
  if (!w) return candidates;

  return candidates
    .filter((c) => {
      if (c.id === "adapt-protein-low-week" && w.nutrition.status === "good") return false;
      if (
        (c.id === "adapt-training-missed" || c.id === "adapt-training-plan-soon") &&
        w.training.status === "good"
      ) {
        return false;
      }
      if (w.nutrition.status === "insufficient_data" && c.type === "nutrition" && c.id !== "adapt-tracking-low") {
        return false;
      }
      return true;
    })
    .map((c) => {
      if (w.nutrition.status === "insufficient_data" && c.confidence === "high") {
        return { ...c, confidence: "low" as const };
      }
      return c;
    });
}

const MODE_TYPES: Partial<Record<CoachContextMode, AdaptiveRecommendationType[]>> = {
  nutrition: ["nutrition", "consistency"],
  training: ["training", "planning", "progress"],
  weight: ["weight", "goal", "nutrition"],
  plan: ["training", "planning", "progress"],
};

export function filterAdaptiveRecommendationsForCoach(
  recs: AdaptiveRecommendations,
  mode: CoachContextMode
): AdaptiveRecommendations {
  const allowed = MODE_TYPES[mode];
  if (!allowed || mode === "general" || mode === "weekly") {
    return {
      ...recs,
      primary: recs.primary,
      secondary: recs.secondary.slice(0, 2),
      coachContext: {
        ...recs.coachContext,
        items: recs.coachContext.items.slice(0, 3),
      },
    };
  }

  const filterList = (list: AdaptiveRecommendation[]) =>
    list.filter((r) => allowed.includes(r.type));

  const primary =
    recs.primary && allowed.includes(recs.primary.type) ? recs.primary : null;
  const secondary = filterList(recs.secondary).slice(0, 2);

  return {
    ...recs,
    primary,
    secondary,
    coachContext: {
      summary: primary?.explanation ?? recs.coachContext.summary,
      items: [primary, ...secondary]
        .filter(Boolean)
        .map((r) => ({
          explanation: r!.explanation,
          evidence: r!.evidence,
          confidence: r!.confidence,
          requiresConfirmation: r!.requiresConfirmation,
        })),
    },
  };
}

function hasActionableProblem(ctx: AdaptiveRecommendationContext): boolean {
  const w = ctx.weekly;
  const d = ctx.daily;
  if (!w && !d) return false;

  if (w?.training.status === "needs_attention") return true;
  if (w?.nutrition.status === "needs_attention") return true;
  if (d?.weight.plateauDetected) return true;
  if (
    w != null &&
    w.nutrition.proteinDaysTotal >= 3 &&
    w.nutrition.proteinDaysOnTarget / w.nutrition.proteinDaysTotal < 0.55
  ) {
    return true;
  }
  if (w?.recovery.status === "needs_attention") return true;
  return false;
}

/** Deterministic adaptive recommendations — no OpenAI, no extra DB when daily/weekly provided. */
export function buildAdaptiveRecommendations(
  ctx: AdaptiveRecommendationContext
): AdaptiveRecommendations {
  const candidates = applyWeeklyConsistencyGuard(
    [
      ...collectNutritionAdaptations(ctx),
      ...collectTrainingAdaptations(ctx),
      ...collectWeightAdaptations(ctx),
      ...collectProgressAdaptations(ctx),
      ...collectRecoveryAdaptations(ctx),
    ],
    ctx
  );

  const proteinLow = candidates.some((c) => c.id === "adapt-protein-low-week");
  if (proteinLow) {
    const meal = findProteinRichSavedMeal(ctx.savedMeals, ctx.proteinTargetG);
    if (meal) {
      const base = candidates.find((c) => c.id === "adapt-protein-low-week");
      candidates.push(
        buildSavedMealRecommendation(meal, base?.evidence ?? [])
      );
    }
  }

  let { primary, secondary } = prioritizeAdaptiveRecommendations(candidates);

  const actionable = hasActionableProblem(ctx);
  const allOnTrack = !actionable && !primary;

  if (allOnTrack) {
    primary = buildOnTrackRecommendation();
    secondary = secondary.filter((s) => !s.id.includes("on-track") && !s.id.includes("on-plan"));
    if (secondary.length > 2) secondary = secondary.slice(0, 2);
  }

  const items = [primary, ...secondary].filter(Boolean).map((r) => ({
    explanation: r!.explanation,
    evidence: r!.evidence,
    confidence: r!.confidence,
    requiresConfirmation: r!.requiresConfirmation,
  }));

  const summary =
    primary?.explanation ??
    (allOnTrack ? "Du bist aktuell im Plan." : "Keine priorisierte Empfehlung.");

  return {
    generatedAt: ctx.now.toISOString(),
    primary,
    secondary,
    allOnTrack: Boolean(allOnTrack && primary?.id === "adapt-all-on-track"),
    coachContext: { summary, items },
  };
}

/** Compact block for AI Coach — structured, not a data dump. */
export function formatAdaptiveRecommendationsForCoach(
  recs: AdaptiveRecommendations
): string {
  const lines: string[] = [
    "ADAPTIVE RECOMMENDATIONS (deterministisch):",
    `Zusammenfassung: ${recs.coachContext.summary}`,
  ];
  for (const item of recs.coachContext.items.slice(0, 3)) {
    const caution =
      item.confidence === "low"
        ? " — vorsichtig formulieren, Datenlage begrenzt"
        : "";
    lines.push(
      `- ${item.explanation} (Confidence: ${item.confidence}${item.requiresConfirmation ? ", Bestätigung nötig" : ""}${caution})`
    );
    if (item.evidence.length) {
      lines.push(`  Evidenz: ${item.evidence.join(" | ")}`);
    }
  }
  return lines.join("\n");
}
