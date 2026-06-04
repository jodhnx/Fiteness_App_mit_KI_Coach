import { unstable_cache } from "next/cache";
import {
  loadAchievementMetrics,
  type AchievementMetrics,
} from "@/lib/achievement-metrics";

const EMPTY: AchievementMetrics = {};

export async function getCachedAchievementMetrics(
  userId: string
): Promise<AchievementMetrics> {
  try {
    return await unstable_cache(
      async () => loadAchievementMetrics(userId),
      [`achievement-metrics-v1-${userId}`],
      { revalidate: 120, tags: [`metrics-${userId}`] }
    )();
  } catch {
    return EMPTY;
  }
}
