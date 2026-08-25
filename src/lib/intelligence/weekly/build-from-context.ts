import type { WeeklyIntelligenceContext } from "@/lib/intelligence/weekly/context";
import {
  buildWeeklyTrainingSnapshot,
  collectWeeklyTrainingInsights,
} from "@/lib/intelligence/weekly/training";
import {
  buildWeeklyNutritionSnapshot,
  collectWeeklyNutritionInsights,
} from "@/lib/intelligence/weekly/nutrition";
import {
  buildWeeklyWeightSnapshot,
  collectWeeklyWeightInsights,
} from "@/lib/intelligence/weekly/weight";
import {
  buildWeeklyProgressSnapshot,
  buildWeeklyAchievements,
  collectWeeklyProgressInsights,
} from "@/lib/intelligence/weekly/progress";
import {
  buildWeeklyRecoverySnapshot,
  collectWeeklyRecoveryInsights,
} from "@/lib/intelligence/weekly/recovery";
import { prioritizeWeeklyInsights } from "@/lib/intelligence/weekly/prioritize";
import type { WeeklyFitnessIntelligence } from "@/lib/intelligence/weekly/types";

export function buildWeeklyIntelligenceFromContext(
  ctx: WeeklyIntelligenceContext
): WeeklyFitnessIntelligence {
  const training = buildWeeklyTrainingSnapshot(ctx);
  const nutrition = buildWeeklyNutritionSnapshot(ctx);
  const weight = buildWeeklyWeightSnapshot(ctx);
  const progress = buildWeeklyProgressSnapshot(ctx);
  const recovery = buildWeeklyRecoverySnapshot(ctx);

  const candidates = [
    ...collectWeeklyTrainingInsights(ctx, training),
    ...collectWeeklyNutritionInsights(ctx, nutrition),
    ...collectWeeklyWeightInsights(ctx, weight),
    ...collectWeeklyProgressInsights(progress),
    ...collectWeeklyRecoveryInsights(recovery),
  ];

  const recommendationCandidates = candidates.filter(
    (c) => c.id.includes("rec") || c.id.includes("plan")
  );

  const achievements = buildWeeklyAchievements(
    ctx,
    training.completed,
    training.planned,
    nutrition
  );

  const { primary, secondary, recommendations } = prioritizeWeeklyInsights(
    candidates,
    recommendationCandidates
  );

  const summary =
    primary?.description ??
    (training.planned != null && training.planned > 0
      ? `${training.completed}/${training.planned} Trainings diese Woche`
      : ctx.weeklyReport.summaryLine);

  const coachContext = {
    weeklySummary: summary,
    weeklyPriorities: [
      primary?.description,
      ...secondary.map((s) => s.description),
    ].filter(Boolean) as string[],
    weeklyAchievements: achievements.map((a) => a.description),
    weeklyRecommendations: recommendations.map((r) => r.description),
  };

  return {
    generatedAt: ctx.now.toISOString(),
    weekLabel: ctx.weekLabel,
    training,
    nutrition,
    weight,
    progress,
    recovery,
    achievements,
    primary,
    secondary,
    recommendations,
    summary,
    coachContext,
  };
}

/** Compact text block for AI Coach — not a full data dump. */
export function formatWeeklyIntelligenceForCoach(
  intel: WeeklyFitnessIntelligence
): string {
  const lines: string[] = [
    "WEEKLY INTELLIGENCE (deterministisch, diese Kalenderwoche):",
    `Zusammenfassung: ${intel.coachContext.weeklySummary}`,
  ];
  if (intel.coachContext.weeklyPriorities.length) {
    lines.push(
      `Prioritäten: ${intel.coachContext.weeklyPriorities.join(" | ")}`
    );
  }
  if (intel.coachContext.weeklyAchievements.length) {
    lines.push(
      `Erfolge: ${intel.coachContext.weeklyAchievements.join("; ")}`
    );
  }
  if (intel.coachContext.weeklyRecommendations.length) {
    lines.push(
      `Empfehlungen: ${intel.coachContext.weeklyRecommendations.join("; ")}`
    );
  }
  lines.push(
    `Training: ${intel.training.completed}${intel.training.planned != null ? `/${intel.training.planned}` : ""} (${intel.training.status})`,
    `Ernährung: Protein ${intel.nutrition.proteinDaysOnTarget}/${intel.nutrition.proteinDaysTotal} Tage (${intel.nutrition.status})`,
    `Gewicht: ${intel.weight.changeKg != null ? `${intel.weight.changeKg} kg` : "keine Daten"} (${intel.weight.status})`
  );
  return lines.join("\n");
}
