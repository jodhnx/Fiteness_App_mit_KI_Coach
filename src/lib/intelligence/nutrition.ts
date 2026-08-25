import type { IntelligenceContext } from "@/lib/intelligence/context";
import type {
  IntelligenceRecommendation,
  NutritionIntelligenceSnapshot,
} from "@/lib/intelligence/types";
import { INTELLIGENCE_ACTIONS } from "@/lib/intelligence/actions";

const PROTEIN_WARN_G = 25;
const PROTEIN_DONE_G = 8;
const CALORIES_WARN_KCAL = 400;
const EVENING_HOUR = 17;

export function buildNutritionSnapshot(
  ctx: IntelligenceContext
): NutritionIntelligenceSnapshot {
  const target = ctx.proteinTarget > 0 ? ctx.proteinTarget : null;
  return {
    caloriesTarget: ctx.calorieTarget > 0 ? ctx.calorieTarget : null,
    caloriesConsumed:
      ctx.calorieTarget > 0 ? Math.round(ctx.caloriesConsumed) : null,
    caloriesRemaining:
      ctx.calorieTarget > 0 ? Math.round(ctx.caloriesRemaining) : null,
    proteinTarget: target,
    proteinConsumed: target != null ? Math.round(ctx.proteinConsumed) : null,
    proteinRemaining:
      target != null ? Math.max(0, Math.round(ctx.proteinRemaining)) : null,
    onTrack:
      target != null &&
      ctx.proteinRemaining <= PROTEIN_DONE_G &&
      ctx.caloriesRemaining >= -150 &&
      ctx.caloriesRemaining <= 300,
  };
}

export function collectNutritionRecommendations(
  ctx: IntelligenceContext
): IntelligenceRecommendation[] {
  const recs: IntelligenceRecommendation[] = [];
  const hour = ctx.now.getHours();
  const proteinLeft = Math.max(0, Math.round(ctx.proteinRemaining));
  const calLeft = Math.round(ctx.caloriesRemaining);

  if (ctx.proteinTarget > 0 && proteinLeft > PROTEIN_WARN_G) {
    recs.push({
      id: "nutrition-protein-low",
      type: "nutrition",
      priority: "primary",
      title: "Protein",
      description: `Dir fehlen noch ca. ${proteinLeft} g Protein.`,
      values: { proteinRemaining: proteinLeft, proteinTarget: ctx.proteinTarget },
      action: INTELLIGENCE_ACTIONS.findMeal,
    });
  }

  if (
    ctx.calorieTarget > 0 &&
    calLeft > CALORIES_WARN_KCAL &&
    hour >= EVENING_HOUR &&
    ctx.caloriesConsumed > ctx.calorieTarget * 0.35
  ) {
    recs.push({
      id: "nutrition-calories-open",
      type: "nutrition",
      priority: "secondary",
      title: "Kalorien",
      description: `Du hast noch ca. ${calLeft} kcal offen.`,
      values: { caloriesRemaining: calLeft },
      action: INTELLIGENCE_ACTIONS.nutrition,
    });
  }

  if (ctx.calorieTarget > 0 && calLeft < -200) {
    recs.push({
      id: "nutrition-calories-over",
      type: "nutrition",
      priority: "secondary",
      title: "Kalorien",
      description: `Du liegst ${Math.abs(calLeft)} kcal über dem Tagesziel.`,
      values: { caloriesRemaining: calLeft },
      action: INTELLIGENCE_ACTIONS.nutrition,
    });
  }

  return recs;
}
