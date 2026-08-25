import { unstable_cache } from "next/cache";
import { buildWeeklyIntelligenceFromContext } from "@/lib/intelligence/weekly/build-from-context";
import { loadWeeklyIntelligenceContext } from "@/lib/intelligence/weekly/load-context";
import type { WeeklyIntelligenceContext } from "@/lib/intelligence/weekly/context";
import type { WeeklyFitnessIntelligence } from "@/lib/intelligence/weekly/types";
import type { WeeklyReport } from "@/lib/weekly-report";

export {
  buildWeeklyIntelligenceFromContext,
  formatWeeklyIntelligenceForCoach,
} from "@/lib/intelligence/weekly/build-from-context";
export {
  buildWeeklyIntelligenceFromHome,
  homeToWeeklyContext,
} from "@/lib/intelligence/weekly/from-home";

const CACHE_SECONDS = 300;

async function buildWeeklyIntelligenceUncached(
  userId: string,
  partial?: Partial<WeeklyIntelligenceContext> & { weeklyReport?: WeeklyReport }
): Promise<WeeklyFitnessIntelligence> {
  const ctx = await loadWeeklyIntelligenceContext(userId, partial);
  return buildWeeklyIntelligenceFromContext(ctx);
}

/**
 * Deterministic weekly intelligence — no OpenAI.
 * Cached server-side (~5 min) per user.
 */
export async function getWeeklyFitnessIntelligence(
  userId: string,
  partial?: Partial<WeeklyIntelligenceContext> & { weeklyReport?: WeeklyReport }
): Promise<WeeklyFitnessIntelligence> {
  if (partial?.weeklyReport) {
    const ctx = await loadWeeklyIntelligenceContext(userId, partial);
    return buildWeeklyIntelligenceFromContext(ctx);
  }

  return unstable_cache(
    () => buildWeeklyIntelligenceUncached(userId),
    [`weekly-intelligence-${userId}`],
    { revalidate: CACHE_SECONDS }
  )();
}

export type {
  WeeklyFitnessIntelligence,
  WeeklyAchievement,
  WeeklyCategoryStatus,
} from "@/lib/intelligence/weekly/types";
