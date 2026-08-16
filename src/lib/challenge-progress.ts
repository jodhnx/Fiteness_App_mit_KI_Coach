import { prisma } from "@/lib/prisma";
import { startOfDay, subDays } from "date-fns";
import { awardXPForAction } from "@/lib/gamification";

export type ChallengeTier = "none" | "bronze" | "silver" | "gold" | "platinum" | "diamond" | "legendary";

export type ChallengeWithProgress = {
  id: string;
  slug: string;
  title: string;
  description: string;
  targetDays: number;
  category: string;
  period: string;
  progress: number;
  tier: ChallengeTier;
  status: string;
};

function tierFromRatio(ratio: number): ChallengeTier {
  if (ratio >= 1) return "legendary";
  if (ratio >= 0.85) return "diamond";
  if (ratio >= 0.7) return "platinum";
  if (ratio >= 0.5) return "gold";
  if (ratio >= 0.33) return "silver";
  if (ratio >= 0.1) return "bronze";
  return "none";
}

async function proteinDaysInRange(userId: string, days: number): Promise<number> {
  const profile = await prisma.profile.findUnique({
    where: { userId },
    select: { proteinTargetG: true },
  });
  const target = profile?.proteinTargetG ?? 150;
  const items = await prisma.mealItem.findMany({
    where: { meal: { userId, date: { gte: subDays(new Date(), days - 1) } } },
    select: {
      quantityG: true,
      foodItem: { select: { proteinG: true, servingG: true } },
      meal: { select: { date: true } },
    },
  });
  const byDay = new Map<string, number>();
  for (const i of items) {
    const key = i.meal.date.toISOString().slice(0, 10);
    const s = i.foodItem.servingG || 100;
    byDay.set(key, (byDay.get(key) ?? 0) + (i.foodItem.proteinG * i.quantityG) / s);
  }
  return [...byDay.values()].filter((p) => p >= target * 0.95).length;
}

async function computeProgress(
  userId: string,
  slug: string,
  targetDays: number
): Promise<number> {
  const today = startOfDay(new Date());
  const since = subDays(today, 29);
  const weekStart = subDays(today, 6);

  switch (slug) {
    case "daily-steps-10k": {
      const row = await prisma.dailyHealthMetric.findUnique({
        where: { userId_date: { userId, date: today } },
      });
      return row && row.steps >= 10000 ? 1 : 0;
    }
    case "daily-protein-150":
      return (await proteinDaysInRange(userId, 1)) >= 1 ? 1 : 0;
    case "daily-water-3l": {
      const logs = await prisma.waterLog.findMany({
        where: { userId, date: { gte: today } },
      });
      const ml = logs.reduce((s, l) => s + l.amountMl, 0);
      return ml >= 3000 ? 1 : 0;
    }
    case "steps-30d-10k": {
      const rows = await prisma.dailyHealthMetric
        .findMany({
          where: { userId, date: { gte: since }, steps: { gte: 10000 } },
        })
        .catch(() => []);
      return rows.length;
    }
    case "steps-week-70k": {
      const rows = await prisma.dailyHealthMetric.findMany({
        where: { userId, date: { gte: weekStart } },
        select: { steps: true },
      });
      return rows.reduce((s, r) => s + r.steps, 0);
    }
    case "month-trainings-16": {
      return prisma.workoutSession.count({
        where: { userId, status: "COMPLETED", completedAt: { gte: since } },
      });
    }
    case "workouts-4-week": {
      const c = await prisma.workoutSession.count({
        where: { userId, status: "COMPLETED", completedAt: { gte: weekStart } },
      });
      return Math.min(targetDays, c);
    }
    case "protein-150-daily":
      return proteinDaysInRange(userId, 7);
    case "water-3l-daily": {
      const logs = await prisma.waterLog.findMany({
        where: { userId, date: { gte: subDays(new Date(), 6) } },
      });
      const byDay = new Map<string, number>();
      for (const l of logs) {
        const key = l.date.toISOString().slice(0, 10);
        byDay.set(key, (byDay.get(key) ?? 0) + l.amountMl);
      }
      return [...byDay.values()].filter((ml) => ml >= 3000).length;
    }
    case "sleep-8h": {
      const rows = await prisma.dailyHealthMetric
        .findMany({
          where: {
            userId,
            date: { gte: subDays(new Date(), 6) },
            sleepHours: { gte: 8 },
          },
        })
        .catch(() => []);
      return rows.length;
    }
    default:
      return 0;
  }
}

export async function loadChallengesWithProgress(
  userId: string,
  options?: { syncDb?: boolean }
): Promise<ChallengeWithProgress[]> {
  const syncDb = options?.syncDb !== false;

  const { ensureChallengeCatalog } = await import("@/lib/ensure-challenge-catalog");
  await ensureChallengeCatalog();

  const defs = await prisma.challenge
    .findMany({ orderBy: [{ period: "asc" }, { category: "asc" }] })
    .catch(() => prisma.challenge.findMany({ orderBy: { category: "asc" } }));

  const userRows = await prisma.userChallenge.findMany({ where: { userId } });
  const byChallenge = new Map(userRows.map((u) => [u.challengeId, u]));

  const progressList = syncDb
    ? await Promise.all(defs.map((c) => computeProgress(userId, c.slug, c.targetDays)))
    : defs.map((c) => byChallenge.get(c.id)?.progress ?? 0);

  const result: ChallengeWithProgress[] = [];

  for (let i = 0; i < defs.length; i++) {
    const c = defs[i];
    const progress = progressList[i];
    const ratio = c.targetDays > 0 ? progress / c.targetDays : 0;
    let uc = byChallenge.get(c.id);
    const wasCompleted = uc?.status === "COMPLETED";
    const nowCompleted = progress >= c.targetDays;

    if (syncDb) {
      if (!uc) {
        uc = await prisma.userChallenge.create({
          data: {
            userId,
            challengeId: c.id,
            progress,
            status: nowCompleted ? "COMPLETED" : "ACTIVE",
            completedAt: nowCompleted ? new Date() : null,
          },
        });
        if (nowCompleted) void awardXPForAction(userId, "CHALLENGE_COMPLETED");
      } else if (uc.progress !== progress || (!wasCompleted && nowCompleted)) {
        uc = await prisma.userChallenge.update({
          where: { id: uc.id },
          data: {
            progress,
            status: nowCompleted ? "COMPLETED" : "ACTIVE",
            completedAt: nowCompleted ? new Date() : null,
          },
        });
        if (!wasCompleted && nowCompleted) {
          void awardXPForAction(userId, "CHALLENGE_COMPLETED");
        }
      }
    } else if (!uc) {
      uc = {
        id: "",
        userId,
        challengeId: c.id,
        status: "ACTIVE",
        progress,
        startedAt: new Date(),
        completedAt: null,
      };
    }

    const period = (c as { period?: string }).period ?? "weekly";

    result.push({
      id: c.id,
      slug: c.slug,
      title: c.title,
      description: c.description,
      targetDays: c.targetDays,
      category: c.category,
      period,
      progress,
      tier: tierFromRatio(ratio),
      status: uc?.status ?? "ACTIVE",
    });
  }

  return result;
}
