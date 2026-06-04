import { prisma } from "@/lib/prisma";
import { getUserTotalXP } from "@/lib/gamification";
import { getLevelFromXP } from "@/lib/level-system";
import type { GamificationSummary } from "@/lib/gamification";

/** Schnelle Gamification-Daten nur für Home-Karte — keine 100+ Achievement-Berechnungen */
export async function loadGamificationHomeCard(
  userId: string
): Promise<GamificationSummary> {
  const [totalXP, unlockedCount, totalAchievements, latestEarned, activeChallenge] =
    await Promise.all([
      getUserTotalXP(userId),
      prisma.userAchievement.count({ where: { userId } }),
      prisma.achievement.count(),
      prisma.userAchievement.findFirst({
        where: { userId },
        orderBy: { earnedAt: "desc" },
        include: {
          achievement: {
            select: { name: true, icon: true, tier: true },
          },
        },
      }),
      prisma.userChallenge.findFirst({
        where: { userId, status: "ACTIVE" },
        orderBy: { progress: "desc" },
        include: {
          challenge: {
            select: { title: true, targetDays: true },
          },
        },
      }),
    ]);

  const level = getLevelFromXP(totalXP);

  return {
    totalXP,
    level,
    unlockedCount,
    totalAchievements,
    latestAchievement: latestEarned
      ? {
          name: latestEarned.achievement.name,
          icon: latestEarned.achievement.icon,
          tier: latestEarned.achievement.tier,
        }
      : null,
    activeChallenge: activeChallenge
      ? {
          title: activeChallenge.challenge.title,
          progress: activeChallenge.progress,
          target: activeChallenge.challenge.targetDays,
          tier: "none",
        }
      : null,
    nearestAchievement: null,
  };
}
