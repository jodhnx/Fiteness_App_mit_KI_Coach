import type { HomeDataPayload } from "@/lib/home-defaults";
import type { WeeklyReport } from "@/lib/weekly-report";
import type { WeeklyIntelligenceContext } from "@/lib/intelligence/weekly/context";
import { buildWeeklyIntelligenceFromContext } from "@/lib/intelligence/weekly/build-from-context";
import type { WeeklyFitnessIntelligence } from "@/lib/intelligence/weekly/types";

export function homeToWeeklyContext(
  home: HomeDataPayload,
  weeklyReport: WeeklyReport
): WeeklyIntelligenceContext {
  return {
    now: new Date(),
    weekLabel: weeklyReport.weekLabel,
    weeklyReport,
    plannedWorkoutsPerWeek: null,
    nutritionGoal: home.nutrition?.targets?.nutritionGoal ?? null,
    trainingGoal: null,
    calorieTarget: home.calorieTarget > 0 ? home.calorieTarget : null,
    proteinTarget: home.proteinTarget > 0 ? home.proteinTarget : null,
    trainingStreakDays:
      home.trainingStreak?.currentDays ?? home.streak?.currentDays ?? 0,
    prsThisWeek: [],
    sessionImprovement: null,
    currentWeightKg: home.weightKg,
  };
}

export function buildWeeklyIntelligenceFromHome(
  home: HomeDataPayload,
  weeklyReport: WeeklyReport,
  extras?: Partial<WeeklyIntelligenceContext>
): WeeklyFitnessIntelligence {
  return buildWeeklyIntelligenceFromContext({
    ...homeToWeeklyContext(home, weeklyReport),
    ...extras,
  });
}
