import { invalidateCache, getCached, setCached } from "@/lib/client-cache";
import { HOME_DATA_CACHE_KEY, HOME_DATA_EVENT } from "@/lib/nutrition-sync";
import { HOME_WORKOUT_CACHE } from "@/lib/home-section-cache";
import { PROGRESS_CACHE_KEY } from "@/lib/progress-cache";
import { CACHE_KEYS } from "@/lib/cache-manager";
import type { HomeDataPayload } from "@/lib/home-defaults";
import { normalizeHomeData } from "@/lib/home-defaults";
import {
  patchHomeAfterWorkoutComplete,
  commitHomeIntelligenceRefresh,
} from "@/lib/intelligence/client-refresh";

export const WORKOUT_ACTIVE_CACHE_KEY = "workouts-active";
export const WORKOUT_ACTIVE_EVENT = "workout-active-updated";
export const PENDING_LIVE_SESSION_KEY = "workout-pending-live-session";

/** Clear stale active-session state after workout complete/cancel. */
export function clearActiveWorkoutCaches(completed?: {
  name: string;
  completedAt: string;
}) {
  invalidateCache(WORKOUT_ACTIVE_CACHE_KEY);
  setCached(WORKOUT_ACTIVE_CACHE_KEY, { session: null }, 90_000);
  invalidateCache(CACHE_KEYS.PLANS_LIST);
  invalidateCache(CACHE_KEYS.JOURNEY);
  invalidateCache(PROGRESS_CACHE_KEY);
  invalidateCache("gamification-full");

  if (typeof window === "undefined") return;

  const prev = getCached<HomeDataPayload>(HOME_DATA_CACHE_KEY);
  if (prev) {
    const patched = completed
      ? patchHomeAfterWorkoutComplete(prev, completed)
      : { ...prev, activeSession: null };
    const next = commitHomeIntelligenceRefresh(patched);
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

type ActiveSessionPatch = {
  id: string;
  name: string;
  startedAt: string;
};

/** Mirror active session into home cache when a workout starts. */
export function patchHomeActiveSession(session: ActiveSessionPatch | null) {
  if (typeof window === "undefined") return;

  setCached(
    WORKOUT_ACTIVE_CACHE_KEY,
    { session: session ? { id: session.id, name: session.name } : null },
    90_000
  );

  const prev = getCached<HomeDataPayload>(HOME_DATA_CACHE_KEY);
  if (!prev) {
    window.dispatchEvent(new CustomEvent(WORKOUT_ACTIVE_EVENT));
    return;
  }

  const next = normalizeHomeData({
    ...prev,
    activeSession: session,
  });
  setCached(HOME_DATA_CACHE_KEY, next, 120_000);
  window.dispatchEvent(new CustomEvent(HOME_DATA_EVENT, { detail: next }));
  window.dispatchEvent(new CustomEvent(WORKOUT_ACTIVE_EVENT));

  const workoutSection = getCached<{
    nextWorkout: HomeDataPayload["nextWorkout"];
    activeSession: ActiveSessionPatch | null;
  }>(HOME_WORKOUT_CACHE);
  if (workoutSection) {
    setCached(
      HOME_WORKOUT_CACHE,
      { ...workoutSection, activeSession: session },
      120_000
    );
  }
}
