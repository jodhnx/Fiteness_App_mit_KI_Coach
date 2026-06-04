import { getLevelFromXP } from "@/lib/level-system";
import type { AchievementProgress } from "@/lib/achievement-engine";
import type { ChallengeWithProgress } from "@/lib/challenge-progress";

export type GamificationApiPayload = {
  totalXP: number;
  level: ReturnType<typeof getLevelFromXP>;
  summary: {
    totalXP: number;
    level: ReturnType<typeof getLevelFromXP>;
    unlockedCount: number;
    totalAchievements: number;
    latestAchievement: { name: string; icon: string; tier: string } | null;
    activeChallenge: { title: string; progress: number; target: number; tier: string } | null;
    nearestAchievement: { name: string; remaining: number; progressLabel: string } | null;
  };
  achievements: AchievementProgress[];
  challenges: ChallengeWithProgress[];
  streak: { currentDays: number; longestDays: number } | null;
  xpHistory: { amount: number; reason: string; createdAt: string }[];
  unlockedCount: number;
  totalAchievements: number;
  _degraded?: boolean;
  _error?: string;
};

export function createEmptyGamificationPayload(
  partial?: Partial<GamificationApiPayload>
): GamificationApiPayload {
  const level = getLevelFromXP(0);
  const summary = {
    totalXP: 0,
    level,
    unlockedCount: 0,
    totalAchievements: 0,
    latestAchievement: null,
    activeChallenge: null,
    nearestAchievement: null,
  };
  return {
    totalXP: 0,
    level,
    summary,
    achievements: [],
    challenges: [],
    streak: null,
    xpHistory: [],
    unlockedCount: 0,
    totalAchievements: 0,
    ...partial,
  };
}
