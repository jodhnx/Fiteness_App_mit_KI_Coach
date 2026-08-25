import type { IntelligenceContext } from "@/lib/intelligence/context";
import {
  buildNutritionSnapshot,
  collectNutritionRecommendations,
} from "@/lib/intelligence/nutrition";
import {
  buildTrainingSnapshot,
  collectTrainingRecommendations,
} from "@/lib/intelligence/training";
import {
  buildWeightSnapshot,
  collectWeightRecommendations,
} from "@/lib/intelligence/weight";
import {
  buildProgressSnapshot,
  collectProgressRecommendations,
} from "@/lib/intelligence/progress";
import {
  buildActivitySnapshot,
  buildRecoverySnapshot,
  collectActivityRecommendations,
  collectRecoveryRecommendations,
} from "@/lib/intelligence/recovery";
import {
  buildAllGoodRecommendation,
  prioritizeRecommendations,
} from "@/lib/intelligence/prioritize";
import type { DailyFitnessIntelligence } from "@/lib/intelligence/types";

/** Pure deterministic builder — no OpenAI, no DB. */
export function buildDailyIntelligenceFromContext(
  ctx: IntelligenceContext
): DailyFitnessIntelligence {
  const nutrition = buildNutritionSnapshot(ctx);
  const training = buildTrainingSnapshot(ctx);
  const weight = buildWeightSnapshot(ctx);
  const progress = buildProgressSnapshot(ctx);
  const recovery = buildRecoverySnapshot(ctx);
  const activity = buildActivitySnapshot(ctx);

  const candidates = [
    ...collectNutritionRecommendations(ctx),
    ...collectTrainingRecommendations(ctx),
    ...collectWeightRecommendations(ctx, weight),
    ...collectProgressRecommendations(ctx, progress),
    ...collectRecoveryRecommendations(ctx),
    ...collectActivityRecommendations(ctx),
  ];

  let { primary, secondary } = prioritizeRecommendations(candidates);

  const hasActionableIssue =
    (nutrition.proteinRemaining != null &&
      nutrition.proteinRemaining > 25 &&
      nutrition.proteinTarget != null) ||
    (!training.doneToday && !training.activeSession && training.plannedToday) ||
    progress.recentPr != null;

  const allGood =
    !hasActionableIssue &&
    candidates.filter((c) => !c.id.includes("streak") && !c.id.includes("stable")).length === 0;

  if (!primary && allGood) {
    primary = buildAllGoodRecommendation();
    secondary = [];
  }

  return {
    generatedAt: ctx.now.toISOString(),
    nutrition,
    training,
    weight,
    progress,
    recovery,
    activity,
    primary,
    secondary,
    allGood: Boolean(allGood && primary?.id === "all-good"),
  };
}
