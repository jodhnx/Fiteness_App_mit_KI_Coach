import { setCached, invalidateCache } from "@/lib/client-cache";
import type { HomeDataPayload } from "@/lib/home-defaults";

export const HOME_HEUTE_CACHE = "home-section-heute";
export const HOME_COACH_CACHE = "home-section-coach";
export const HOME_INSIGHTS_CACHE = "home-section-insights";
export const HOME_WORKOUT_CACHE = "home-section-workout";
export const HOME_SECTION_INTELLIGENCE = "home-section-intelligence";
export const HOME_SECTION_WEEKLY_INTELLIGENCE = "home-section-weekly-intelligence";
export const HOME_SECTION_ADAPTIVE = "home-section-adaptive";

const SECTION_TTL = 120_000;

export function invalidateIntelligenceSectionCaches() {
  invalidateCache(HOME_SECTION_INTELLIGENCE);
  invalidateCache(HOME_SECTION_WEEKLY_INTELLIGENCE);
  invalidateCache(HOME_SECTION_ADAPTIVE);
}

/** Split bundled /api/home payload into section caches for instant partial paint. */
export function hydrateHomeSectionCaches(data: HomeDataPayload) {
  setCached(
    HOME_HEUTE_CACHE,
    {
      nutrition: data.nutrition,
      steps: data.healthToday?.steps ?? 0,
      stepGoal: data.healthToday?.stepGoal ?? 10000,
      caloriesBurned: data.caloriesBurnedTotal ?? data.healthToday?.caloriesBurned ?? 0,
    },
    SECTION_TTL
  );
  setCached(HOME_COACH_CACHE, data.coach, SECTION_TTL);
  if (data.intelligence) {
    setCached(HOME_SECTION_INTELLIGENCE, data.intelligence, SECTION_TTL);
  }
  if (data.weeklyIntelligence) {
    setCached(HOME_SECTION_WEEKLY_INTELLIGENCE, data.weeklyIntelligence, SECTION_TTL);
  }
  if (data.adaptiveRecommendations) {
    setCached(HOME_SECTION_ADAPTIVE, data.adaptiveRecommendations, SECTION_TTL);
  }
  setCached(
    HOME_INSIGHTS_CACHE,
    {
      recovery: data.recovery,
      weeklyReport: data.weeklyReport,
      weeklyIntelligence: data.weeklyIntelligence,
      adaptiveRecommendations: data.adaptiveRecommendations,
      dailyActionPlan: data.dailyActionPlan,
    },
    SECTION_TTL
  );
  setCached(
    HOME_WORKOUT_CACHE,
    {
      nextWorkout: data.nextWorkout,
      activeSession: data.activeSession,
    },
    SECTION_TTL
  );
}

export type HomeHeuteSection = {
  nutrition?: HomeDataPayload["nutrition"];
  steps: number;
  stepGoal: number;
  caloriesBurned: number;
};

export type HomeWorkoutSection = {
  nextWorkout: HomeDataPayload["nextWorkout"];
  activeSession: HomeDataPayload["activeSession"];
};

export type HomeInsightsSection = {
  recovery?: HomeDataPayload["recovery"];
  weeklyReport?: HomeDataPayload["weeklyReport"];
  weeklyIntelligence?: HomeDataPayload["weeklyIntelligence"];
  adaptiveRecommendations?: HomeDataPayload["adaptiveRecommendations"];
  dailyActionPlan?: HomeDataPayload["dailyActionPlan"];
};
