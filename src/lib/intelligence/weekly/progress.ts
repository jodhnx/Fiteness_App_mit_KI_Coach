import { INTELLIGENCE_ACTIONS } from "@/lib/intelligence/actions";
import type { IntelligenceRecommendation } from "@/lib/intelligence/types";
import type { WeeklyIntelligenceContext } from "@/lib/intelligence/weekly/context";
import type {
  WeeklyAchievement,
  WeeklyProgressSnapshot,
} from "@/lib/intelligence/weekly/types";

export function buildWeeklyProgressSnapshot(
  ctx: WeeklyIntelligenceContext
): WeeklyProgressSnapshot {
  const prsThisWeek = ctx.prsThisWeek.map((p) => ({
    exerciseName: p.exerciseName,
    valueKg: p.weightKg,
    achievedAt: p.achievedAt.toISOString(),
  }));

  let status: WeeklyProgressSnapshot["status"] = "insufficient_data";
  if (prsThisWeek.length > 0 || ctx.sessionImprovement) {
    status = "positive";
  } else if (ctx.weeklyReport.workouts >= 2) {
    status = "neutral";
  }

  return {
    prsThisWeek,
    topImprovement: ctx.sessionImprovement,
    status,
  };
}

export function collectWeeklyProgressInsights(
  snap: WeeklyProgressSnapshot
): IntelligenceRecommendation[] {
  const recs: IntelligenceRecommendation[] = [];

  for (const pr of snap.prsThisWeek.slice(0, 2)) {
    recs.push({
      id: `weekly-pr-${pr.exerciseName}`,
      type: "achievement",
      priority: "primary",
      title: "Neuer PR",
      description: `${pr.exerciseName}: ${pr.valueKg} kg.`,
      values: { weightKg: pr.valueKg },
      action: INTELLIGENCE_ACTIONS.records,
    });
  }

  if (snap.topImprovement) {
    recs.push({
      id: "weekly-session-improvement",
      type: "progress",
      priority: "secondary",
      title: "Fortschritt",
      description: `${snap.topImprovement.exerciseName}: ${snap.topImprovement.detail}.`,
      action: INTELLIGENCE_ACTIONS.progress,
    });
  }

  return recs;
}

export function buildWeeklyAchievements(
  ctx: WeeklyIntelligenceContext,
  trainingCompleted: number,
  trainingPlanned: number | null,
  nutritionSnap: { proteinDaysOnTarget: number; proteinDaysTotal: number; status: string }
): WeeklyAchievement[] {
  const items: WeeklyAchievement[] = [];

  for (const pr of ctx.prsThisWeek.slice(0, 3)) {
    items.push({
      id: `ach-pr-${pr.exerciseName}`,
      type: "pr",
      title: "Neuer Rekord",
      description: `${pr.exerciseName} ${pr.weightKg} kg`,
    });
  }

  if (
    trainingPlanned != null &&
    trainingPlanned > 0 &&
    trainingCompleted >= trainingPlanned
  ) {
    items.push({
      id: "ach-training-plan",
      type: "training",
      title: "Trainingsplan",
      description: `Alle ${trainingPlanned} geplanten Einheiten absolviert`,
    });
  }

  if (
    nutritionSnap.proteinDaysTotal >= 5 &&
    nutritionSnap.proteinDaysOnTarget >= Math.ceil(nutritionSnap.proteinDaysTotal * 0.7)
  ) {
    items.push({
      id: "ach-protein-week",
      type: "nutrition",
      title: "Protein-Konsistenz",
      description: `${nutritionSnap.proteinDaysOnTarget}/${nutritionSnap.proteinDaysTotal} Tage im Ziel`,
    });
  }

  if (ctx.trainingStreakDays >= 5) {
    items.push({
      id: "ach-streak",
      type: "streak",
      title: "Training-Streak",
      description: `${ctx.trainingStreakDays} Tage in Folge`,
    });
  }

  if (ctx.weeklyReport.goalReached) {
    items.push({
      id: "ach-goal",
      type: "goal",
      title: "Wochenziel",
      description: "Zielgewicht erreicht",
    });
  }

  return items;
}
