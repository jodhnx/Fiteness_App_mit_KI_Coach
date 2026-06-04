import { setCached } from "@/lib/client-cache";
import type { HomeDataPayload } from "@/lib/home-defaults";

export const HOME_HEUTE_CACHE = "home-section-heute";
export const HOME_COACH_CACHE = "home-section-coach";
export const HOME_INSIGHTS_CACHE = "home-section-insights";
export const HOME_WORKOUT_CACHE = "home-section-workout";

const SECTION_TTL = 120_000;

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
  setCached(
    HOME_INSIGHTS_CACHE,
    { recovery: data.recovery, weeklyReport: data.weeklyReport },
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
};
