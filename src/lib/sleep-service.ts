import { prisma } from "@/lib/prisma";
import { startOfDay, subDays } from "date-fns";
import { isSchemaMismatchError } from "@/lib/prisma-errors";

export type SleepQuality = "POOR" | "MEDIUM" | "GOOD" | "EXCELLENT";

export async function logSleep(
  userId: string,
  data: {
    sleepHours: number;
    sleepQuality?: SleepQuality;
    recoveryRating?: string;
  }
) {
  const today = startOfDay(new Date());
  try {
    return await prisma.dailyHealthMetric.upsert({
      where: { userId_date: { userId, date: today } },
      create: {
        userId,
        date: today,
        steps: 0,
        sleepHours: data.sleepHours,
        sleepQuality: data.sleepQuality ?? null,
        recoveryRating: data.recoveryRating ?? null,
      },
      update: {
        sleepHours: data.sleepHours,
        sleepQuality: data.sleepQuality ?? undefined,
        recoveryRating: data.recoveryRating ?? undefined,
      },
    });
  } catch (e) {
    if (isSchemaMismatchError(e)) {
      throw new Error("Schlaf-Tracking benötigt DB-Migration (sleepHours).");
    }
    throw e;
  }
}

export async function getSleepWeekStats(userId: string) {
  const since = subDays(startOfDay(new Date()), 6);
  try {
    const rows = await prisma.dailyHealthMetric.findMany({
      where: { userId, date: { gte: since }, sleepHours: { not: null } },
      orderBy: { date: "asc" },
      select: { date: true, sleepHours: true, sleepQuality: true, recoveryRating: true },
    });
    const values = rows.map((r) => r.sleepHours!).filter((h) => h > 0);
    const avg =
      values.length > 0
        ? Math.round((values.reduce((a, b) => a + b, 0) / values.length) * 10) / 10
        : null;
    const lowNights = values.filter((h) => h < 6).length;
    return { rows, avgHours: avg, lowNightsLast7: lowNights, nightsLogged: values.length };
  } catch {
    return { rows: [], avgHours: null, lowNightsLast7: 0, nightsLogged: 0 };
  }
}
