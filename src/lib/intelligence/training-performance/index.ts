import { unstable_cache } from "next/cache";
import { loadTrainingPerformanceContext } from "@/lib/intelligence/training-performance/load-context";
import {
  buildTrainingPerformanceIntelligence,
  formatTrainingPerformanceForCoach,
} from "@/lib/intelligence/training-performance/build";
import type { TrainingPerformanceIntelligence } from "@/lib/intelligence/training-performance/types";

export {
  buildTrainingPerformanceIntelligence,
  formatTrainingPerformanceForCoach,
} from "@/lib/intelligence/training-performance/build";
export {
  analyzeExercisePerformance,
  buildExerciseHistories,
  parseRepRange,
  pickBestSet,
  suggestNextWeight,
  prioritizePerformanceInsights,
} from "@/lib/intelligence/training-performance/analyze";
export type {
  TrainingPerformanceIntelligence,
  ExercisePerformanceInsight,
  ProgressionState,
  PerformanceConfidence,
} from "@/lib/intelligence/training-performance/types";

const CACHE_SECONDS = 300;

async function buildUncached(userId: string): Promise<TrainingPerformanceIntelligence> {
  const loaded = await loadTrainingPerformanceContext(userId);
  return buildTrainingPerformanceIntelligence(loaded);
}

/**
 * Deterministic training performance intelligence — no OpenAI.
 * Cached server-side (~5 min) per user.
 */
export async function getTrainingPerformanceIntelligence(
  userId: string,
  options?: { skipCache?: boolean }
): Promise<TrainingPerformanceIntelligence> {
  if (options?.skipCache) {
    return buildUncached(userId);
  }

  return unstable_cache(
    () => buildUncached(userId),
    [`training-performance-${userId}`],
    { revalidate: CACHE_SECONDS, tags: [`training-performance-${userId}`] }
  )();
}
