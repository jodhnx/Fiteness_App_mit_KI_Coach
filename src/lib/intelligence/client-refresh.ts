import { getCached } from "@/lib/client-cache";
import type { HomeDataPayload } from "@/lib/home-defaults";
import { normalizeHomeData } from "@/lib/home-defaults";
import type { NutritionDashboardPayload } from "@/lib/nutrition-defaults";
import { buildDailyIntelligenceFromHome } from "@/lib/intelligence/from-home";
import { buildAdaptiveRecommendations } from "@/lib/intelligence/recommendations/build";
import { buildDailyActionPlanFromHome } from "@/lib/intelligence/daily-plan/from-home";
import { getCachedSavedMeals } from "@/lib/saved-meals-cache";
import { hydrateHomeSectionCaches } from "@/lib/home-section-cache";
import { PROGRESS_CACHE_KEY } from "@/lib/progress-cache";
import { isSameDay, startOfDay } from "date-fns";

export const HOME_SECTION_INTELLIGENCE = "home-section-intelligence";
export const HOME_SECTION_WEEKLY_INTELLIGENCE = "home-section-weekly-intelligence";
export const HOME_SECTION_ADAPTIVE = "home-section-adaptive";

export type IntelligenceRefreshOptions = {
  nutrition?: NutritionDashboardPayload | null;
  weightEntries?: { date: Date; weightKg: number }[];
};

/** Read weight rows from progress client cache — no extra network. */
export function weightEntriesFromProgressCache(): { date: Date; weightKg: number }[] {
  const progress = getCached<{ entries?: { date: string; weightKg?: number }[] }>(
    PROGRESS_CACHE_KEY,
    { allowStale: true }
  );
  if (!progress?.entries?.length) return [];
  return progress.entries
    .filter((e) => e.weightKg != null && Number.isFinite(e.weightKg))
    .map((e) => ({
      date: startOfDay(new Date(e.date)),
      weightKg: e.weightKg!,
    }))
    .sort((a, b) => a.date.getTime() - b.date.getTime());
}

/** Optimistic workout-complete patch for activity/week counters. */
export function patchHomeAfterWorkoutComplete(
  home: HomeDataPayload,
  completed: { name: string; completedAt: string }
): HomeDataPayload {
  const completedAt = new Date(completed.completedAt);
  const next: HomeDataPayload = {
    ...home,
    activeSession: null,
    lastCompletedWorkout: completed,
  };

  if (!isSameDay(completedAt, new Date())) return next;

  const weekCount = (next.activityWeek?.count ?? 0) + 1;
  next.activityWeek = {
    ...next.activityWeek,
    count: weekCount,
  };

  if (next.weeklyReport) {
    next.weeklyReport = {
      ...next.weeklyReport,
      workouts: next.weeklyReport.workouts + 1,
    };
  }

  const streak = next.trainingStreak?.currentDays ?? next.streak?.currentDays ?? 0;
  if (streak >= 0) {
    next.trainingStreak = {
      currentDays: streak + 1,
      longestDays: Math.max(next.trainingStreak?.longestDays ?? 0, streak + 1),
    };
  }

  return next;
}

/** Rebuild daily + adaptive layers from existing home payload — no DB, no OpenAI. */
export function rebuildHomeIntelligenceLayers(
  home: HomeDataPayload,
  options: IntelligenceRefreshOptions = {}
): HomeDataPayload {
  const nutrition = options.nutrition ?? home.nutrition ?? null;
  const weightEntries = options.weightEntries ?? weightEntriesFromProgressCache();

  const intelligence = buildDailyIntelligenceFromHome(home, nutrition, weightEntries);
  const adaptiveRecommendations = buildAdaptiveRecommendations({
    now: new Date(),
    nutritionGoal: nutrition?.targets?.nutritionGoal ?? null,
    daily: intelligence,
    weekly: home.weeklyIntelligence ?? null,
    savedMeals: getCachedSavedMeals() ?? undefined,
    proteinTargetG: home.proteinTarget > 0 ? home.proteinTarget : null,
    workoutDaysPerWeek: null,
  });

  const merged = normalizeHomeData({
    ...home,
    intelligence,
    adaptiveRecommendations,
  });

  const dailyActionPlan = buildDailyActionPlanFromHome(merged, {
    savedMeals: getCachedSavedMeals() ?? undefined,
  });

  return normalizeHomeData({
    ...merged,
    dailyActionPlan,
  });
}

/** Persist intelligence layers + section caches. */
export function commitHomeIntelligenceRefresh(
  home: HomeDataPayload,
  options: IntelligenceRefreshOptions = {}
): HomeDataPayload {
  const next = rebuildHomeIntelligenceLayers(home, options);
  hydrateHomeSectionCaches(next);
  return next;
}
