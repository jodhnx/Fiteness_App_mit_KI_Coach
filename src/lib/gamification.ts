import { prisma } from "@/lib/prisma";
import { getLevelFromXP } from "@/lib/level-system";
import { XP_REWARDS, type XPAction } from "@/lib/xp-rewards";
import { startOfDay } from "date-fns";
import {
  triggerAchievementCheck,
  loadAchievementsWithProgress,
} from "@/lib/achievement-engine";
import { loadChallengesWithProgress } from "@/lib/challenge-progress";
import { loadGamificationHomeCard } from "@/lib/gamification-home";

export async function getUserTotalXP(userId: string): Promise<number> {
  const result = await prisma.xPTransaction.aggregate({
    where: { userId },
    _sum: { amount: true },
  });
  return result._sum.amount ?? 0;
}

export async function awardXP(userId: string, amount: number, reason: string) {
  if (amount <= 0) return { total: await getUserTotalXP(userId), level: getLevelFromXP(await getUserTotalXP(userId)) };
  await prisma.xPTransaction.create({
    data: { userId, amount, reason },
  });
  const total = await getUserTotalXP(userId);
  const level = getLevelFromXP(total);
  return { total, level };
}

/** Award once per calendar day for the same reason prefix */
export async function awardXPOnceDaily(
  userId: string,
  amount: number,
  reasonPrefix: string
) {
  const dayStart = startOfDay(new Date());
  const existing = await prisma.xPTransaction.findFirst({
    where: {
      userId,
      reason: { startsWith: reasonPrefix },
      createdAt: { gte: dayStart },
    },
  });
  if (existing) return null;
  return awardXP(userId, amount, reasonPrefix);
}

export async function awardXPForAction(userId: string, action: XPAction) {
  const amount = XP_REWARDS[action];
  const reasonMap: Record<XPAction, string> = {
    TRAINING_SESSION: "xp:training-session",
    WORKOUT_COMPLETED: "xp:workout-completed",
    STEPS_10K: "xp:steps-10k",
    PROTEIN_GOAL: "xp:protein-goal",
    CALORIE_GOAL: "xp:calorie-goal",
    WEIGHT_LOGGED: "xp:weight-logged",
    ACTIVITY_COMPLETED: "xp:activity-completed",
    CHALLENGE_COMPLETED: "xp:challenge-completed",
  };
  const dailyActions: XPAction[] = [
    "STEPS_10K",
    "PROTEIN_GOAL",
    "CALORIE_GOAL",
    "WEIGHT_LOGGED",
  ];
  const reason = reasonMap[action];
  const result = dailyActions.includes(action)
    ? await awardXPOnceDaily(userId, amount, reason)
    : await awardXP(userId, amount, reason);
  triggerAchievementCheck(userId);
  return result;
}

export async function checkAndAwardAchievements(userId: string, slug: string) {
  const achievement = await prisma.achievement.findUnique({ where: { slug } });
  if (!achievement) return null;
  const existing = await prisma.userAchievement.findUnique({
    where: { userId_achievementId: { userId, achievementId: achievement.id } },
  });
  if (existing) return null;
  await prisma.userAchievement.create({
    data: { userId, achievementId: achievement.id },
  });
  await awardXP(userId, achievement.xpReward, `Achievement: ${achievement.slug}`);
  await prisma.notification.create({
    data: {
      userId,
      type: "ACHIEVEMENT",
      title: "Neuer Erfolg!",
      message: achievement.name,
      link: "/erfolge",
    },
  });
  return achievement;
}

export async function updateStreak(userId: string) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  let streak = await prisma.streak.findUnique({ where: { userId } });
  if (!streak) {
    streak = await prisma.streak.create({
      data: { userId, currentDays: 1, longestDays: 1, lastActiveAt: today },
    });
    return streak;
  }
  const last = streak.lastActiveAt ? new Date(streak.lastActiveAt) : null;
  if (last) {
    last.setHours(0, 0, 0, 0);
    const diff = (today.getTime() - last.getTime()) / (1000 * 60 * 60 * 24);
    if (diff === 0) return streak;
    if (diff === 1) {
      const currentDays = streak.currentDays + 1;
      return prisma.streak.update({
        where: { userId },
        data: {
          currentDays,
          longestDays: Math.max(streak.longestDays, currentDays),
          lastActiveAt: today,
        },
      });
    }
    return prisma.streak.update({
      where: { userId },
      data: { currentDays: 1, lastActiveAt: today },
    });
  }
  return prisma.streak.update({
    where: { userId },
    data: { currentDays: 1, lastActiveAt: today },
  });
}

export type GamificationSummary = {
  totalXP: number;
  level: ReturnType<typeof getLevelFromXP>;
  unlockedCount: number;
  totalAchievements: number;
  latestAchievement: { name: string; icon: string; tier: string } | null;
  activeChallenge: { title: string; progress: number; target: number; tier: string } | null;
  nearestAchievement: { name: string; remaining: number; progressLabel: string } | null;
};

export async function loadGamificationSummary(userId: string): Promise<GamificationSummary> {
  return loadGamificationHomeCard(userId);
}

/** Volle Auswertung — nur Erfolge-Seite / refresh=1 */
export async function loadGamificationSummaryFull(userId: string): Promise<GamificationSummary> {
  const [totalXP, achievements, challenges] = await Promise.all([
    getUserTotalXP(userId),
    loadAchievementsWithProgress(userId),
    loadChallengesWithProgress(userId, { syncDb: false }),
  ]);

  const level = getLevelFromXP(totalXP);
  const unlocked = achievements.filter((a) => a.earned);
  const latest = unlocked
    .filter((a) => a.earnedAt)
    .sort((a, b) => (b.earnedAt ?? "").localeCompare(a.earnedAt ?? ""))[0];

  const activeChallenges = challenges.filter((c) => c.status !== "COMPLETED");
  const activeChallenge = activeChallenges.sort(
    (a, b) => b.progress / Math.max(1, b.targetDays) - a.progress / Math.max(1, a.targetDays)
  )[0];

  const open = achievements
    .filter((a) => !a.earned)
    .sort((a, b) => b.progressPercent - a.progressPercent)[0];

  let nearestAchievement: GamificationSummary["nearestAchievement"] = null;
  if (open) {
    const raw = open.progressPercent;
    const approxCurrent = Math.floor((raw / 100) * open.targetValue);
    nearestAchievement = {
      name: open.name,
      remaining: Math.max(0, open.targetValue - approxCurrent),
      progressLabel: `${approxCurrent} / ${open.targetValue}`,
    };
  }

  return {
    totalXP,
    level,
    unlockedCount: unlocked.length,
    totalAchievements: achievements.length,
    latestAchievement: latest
      ? { name: latest.name, icon: latest.icon, tier: latest.tier }
      : null,
    activeChallenge: activeChallenge
      ? {
          title: activeChallenge.title,
          progress: activeChallenge.progress,
          target: activeChallenge.targetDays,
          tier: activeChallenge.tier,
        }
      : null,
    nearestAchievement,
  };
}
