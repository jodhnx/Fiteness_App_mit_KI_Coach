import { prisma } from "@/lib/prisma";
import { ensureAchievementsSeeded } from "@/lib/achievement-seed-runtime";
import { getCachedAchievementMetrics } from "@/lib/achievement-metrics-cache";
import { checkAndAwardAchievements } from "@/lib/gamification";
import type { BadgeTier } from "@/lib/achievement-catalog";
import { metricKeyFromSlug } from "@/lib/achievement-metric-backfill";

export type AchievementProgress = {
  id: string;
  slug: string;
  name: string;
  description: string;
  icon: string;
  category: string;
  tier: BadgeTier;
  xpReward: number;
  targetValue: number;
  currentValue: number;
  earned: boolean;
  earnedAt: string | null;
  progressPercent: number;
};

export type UnlockEvent = {
  slug: string;
  name: string;
  icon: string;
  tier: BadgeTier;
  xpReward: number;
};

export async function evaluateAndUnlockAchievements(userId: string): Promise<UnlockEvent[]> {
  const metrics = await getCachedAchievementMetrics(userId);
  const achievements = await prisma.achievement.findMany({
    include: { userAchievements: { where: { userId }, take: 1 } },
    orderBy: { sortOrder: "asc" },
  });

  const unlocks: UnlockEvent[] = [];

  for (const a of achievements) {
    if (a.userAchievements.length > 0) continue;
    const metricKey = a.metricKey ?? metricKeyFromSlug(a.slug, a.category);
    const targetValue = a.targetValue > 0 ? a.targetValue : 1;
    const current = metrics[metricKey] ?? 0;
    if (current < targetValue) continue;

    const earned = await checkAndAwardAchievements(userId, a.slug);
    if (earned) {
      unlocks.push({
        slug: a.slug,
        name: earned.name,
        icon: earned.icon,
        tier: (earned.tier as BadgeTier) || "bronze",
        xpReward: earned.xpReward,
      });
    }
  }

  return unlocks;
}

export async function loadAchievementsWithProgress(
  userId: string
): Promise<AchievementProgress[]> {
  try {
    const metrics = await getCachedAchievementMetrics(userId).catch((e) => {
      console.error("[achievement-engine] metrics failed", e);
      return {} as Record<string, number>;
    });

    let rows = await prisma.achievement
      .findMany({
        include: { userAchievements: { where: { userId }, take: 1 } },
        orderBy: [{ category: "asc" }, { sortOrder: "asc" }],
      })
      .catch((e) => {
        console.error("[achievement-engine] findMany failed", e);
        return [];
      });

    if (rows.length === 0) {
      await ensureAchievementsSeeded(prisma).catch((e) =>
        console.error("[achievement-engine] auto-seed failed", e)
      );
      rows = await prisma.achievement
        .findMany({
          include: { userAchievements: { where: { userId }, take: 1 } },
          orderBy: [{ category: "asc" }, { sortOrder: "asc" }],
        })
        .catch(() => []);
    }

    if (rows.length === 0) return [];

    return rows.map((a) => {
    const metricKey = a.metricKey ?? metricKeyFromSlug(a.slug, a.category);
    const targetValue = a.targetValue > 0 ? a.targetValue : 1;
    const earned = a.userAchievements[0];
    const currentValue = Math.min(
      targetValue,
      Math.floor(metrics[metricKey] ?? 0)
    );
    const raw = metrics[metricKey] ?? 0;
    const progressPercent = earned
      ? 100
      : Math.min(100, Math.round((raw / targetValue) * 100));

    return {
      id: a.id,
      slug: a.slug,
      name: a.name,
      description: a.description,
      icon: a.icon,
      category: a.category,
      tier: (a.tier as BadgeTier) || "bronze",
      xpReward: a.xpReward,
      targetValue,
      currentValue: earned ? targetValue : currentValue,
      earned: !!earned,
      earnedAt: earned?.earnedAt.toISOString() ?? null,
      progressPercent,
    };
  });
  } catch (e) {
    console.error("[achievement-engine] loadAchievementsWithProgress", e);
    return [];
  }
}

export async function getNearestAchievement(
  userId: string
): Promise<{ name: string; remaining: number; progressLabel: string } | null> {
  const list = await loadAchievementsWithProgress(userId);
  const open = list
    .filter((a) => !a.earned && a.progressPercent > 0)
    .sort((a, b) => b.progressPercent - a.progressPercent);
  const top = open[0];
  if (!top) return null;
  const metrics = await getCachedAchievementMetrics(userId);
  const raw = metrics[await prisma.achievement
    .findUnique({ where: { id: top.id }, select: { metricKey: true } })
    .then((x) => x?.metricKey ?? "")] ?? 0;
  const remaining = Math.max(0, top.targetValue - Math.floor(raw));
  return {
    name: top.name,
    remaining,
    progressLabel: `${Math.floor(raw)} / ${top.targetValue}`,
  };
}

/** Run evaluation in background — safe to call after user actions */
export function triggerAchievementCheck(userId: string) {
  void evaluateAndUnlockAchievements(userId).catch((e) =>
    console.error("[achievement-engine]", e)
  );
}
