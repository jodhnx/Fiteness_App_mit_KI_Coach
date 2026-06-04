import { prisma } from "@/lib/prisma";
import type { CaloriePlanContext } from "@/lib/calorie-target";
import { subDays, startOfDay } from "date-fns";

/** Ø Schritte & aktive Minuten der letzten 7 Tage für Kalorienplan */
export async function loadCaloriePlanContext(userId: string): Promise<CaloriePlanContext> {
  try {
    const since = subDays(startOfDay(new Date()), 6);
    const rows = await prisma.dailyHealthMetric.findMany({
      where: { userId, date: { gte: since } },
      select: { steps: true, activeMinutes: true },
    });
    if (rows.length === 0) return {};
    const n = rows.length;
    const averageDailySteps = Math.round(
      rows.reduce((s, r) => s + r.steps, 0) / n
    );
    const averageActiveMinutes = Math.round(
      rows.reduce((s, r) => s + r.activeMinutes, 0) / n
    );
    return { averageDailySteps, averageActiveMinutes };
  } catch {
    return {};
  }
}
