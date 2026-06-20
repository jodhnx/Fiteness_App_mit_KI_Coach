import { invalidateCache, getCached, setCached } from "@/lib/client-cache";
import { HOME_DATA_CACHE_KEY, HOME_DATA_EVENT } from "@/lib/nutrition-sync";
import { HOME_WORKOUT_CACHE } from "@/lib/home-section-cache";
import { PROGRESS_CACHE_KEY } from "@/lib/progress-cache";
import type { HomeDataPayload } from "@/lib/home-defaults";

export const WORKOUT_ACTIVE_CACHE_KEY = "workouts-active";
export const WORKOUT_ACTIVE_EVENT = "workout-active-updated";

/** Clear stale active-session state after workout complete/cancel. */
export function clearActiveWorkoutCaches(completed?: {
  name: string;
  completedAt: string;
}) {
  invalidateCache(WORKOUT_ACTIVE_CACHE_KEY);
  setCached(WORKOUT_ACTIVE_CACHE_KEY, { session: null }, 90_000);
  invalidateCache("workouts-journey-hub");
  invalidateCache("workouts-journey");
  invalidateCache(PROGRESS_CACHE_KEY);
  invalidateCache("gamification-full");

  if (typeof window === "undefined") return;

  const prev = getCached<HomeDataPayload>(HOME_DATA_CACHE_KEY);
  if (prev) {
    const next: HomeDataPayload = {
      ...prev,
      activeSession: null,
      ...(completed ? { lastCompletedWorkout: completed } : {}),
    };
    setCached(HOME_DATA_CACHE_KEY, next, 120_000);
    window.dispatchEvent(new CustomEvent(HOME_DATA_EVENT, { detail: next }));
  }

  window.dispatchEvent(new CustomEvent(WORKOUT_ACTIVE_EVENT));

  const workoutSection = getCached<{ nextWorkout: HomeDataPayload["nextWorkout"]; activeSession: null }>(
    HOME_WORKOUT_CACHE
  );
  if (workoutSection) {
    setCached(
      HOME_WORKOUT_CACHE,
      { ...workoutSection, activeSession: null },
      120_000
    );
  }
}
