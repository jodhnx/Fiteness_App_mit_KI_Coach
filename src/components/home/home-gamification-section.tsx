"use client";

import { memo } from "react";
import { useCachedFetch } from "@/hooks/use-cached-fetch";
import { HomeAchievementsCard } from "@/components/home/home-achievements-card";
import type { HomeDataPayload } from "@/lib/home-defaults";
import type { GamificationSummary } from "@/lib/gamification";

function toCardData(s: GamificationSummary): NonNullable<HomeDataPayload["gamification"]> {
  return {
    totalXP: s.totalXP,
    level: s.level.level,
    levelName: s.level.name,
    progressPercent: s.level.progressPercent,
    xpToNext: s.level.xpToNext,
    unlockedCount: s.unlockedCount,
    totalAchievements: s.totalAchievements,
    latestAchievement: s.latestAchievement,
    activeChallenge: s.activeChallenge
      ? {
          title: s.activeChallenge.title,
          progress: s.activeChallenge.progress,
          target: s.activeChallenge.target,
        }
      : null,
  };
}

export const HomeGamificationSection = memo(function HomeGamificationSection() {
  const { data } = useCachedFetch<{ summary: GamificationSummary }>(
    "gamification-home-summary",
    "/api/gamification?summary=1",
    120_000,
    6_000,
    { revalidateOnMount: true, staleRatio: 0.92 }
  );

  if (!data?.summary) return null;

  return <HomeAchievementsCard g={toCardData(data.summary)} />;
});
