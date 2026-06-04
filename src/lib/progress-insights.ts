import { prisma } from "@/lib/prisma";
import { startOfMonth, subMonths, startOfWeek } from "date-fns";

export type ProgressInsights = {
  summaryLines: string[];
  weightChangeMonthKg: number | null;
  workoutsThisMonth: number;
  workoutsLastMonth: number;
  proteinDaysOnTarget: number;
  proteinDaysTotal: number;
};

export async function buildProgressInsights(userId: string): Promise<ProgressInsights> {
  const now = new Date();
  const monthStart = startOfMonth(now);
  const lastMonthStart = startOfMonth(subMonths(now, 1));
  const weekStart = startOfWeek(now, { weekStartsOn: 1 });

  const [profile, entries, sessionsThisMonth, sessionsLastMonth, proteinItems] =
    await Promise.all([
      prisma.profile.findUnique({
        where: { userId },
        select: { proteinTargetG: true, weightKg: true },
      }),
      prisma.progressEntry.findMany({
        where: { userId, weightKg: { not: null } },
        orderBy: { date: "asc" },
        take: 60,
        select: { date: true, weightKg: true },
      }),
      prisma.workoutSession.count({
        where: {
          userId,
          status: "COMPLETED",
          completedAt: { gte: monthStart },
        },
      }),
      prisma.workoutSession.count({
        where: {
          userId,
          status: "COMPLETED",
          completedAt: { gte: lastMonthStart, lt: monthStart },
        },
      }),
      prisma.mealItem.findMany({
        where: { meal: { userId, date: { gte: weekStart } } },
        select: {
          quantityG: true,
          foodItem: { select: { proteinG: true, servingG: true } },
          meal: { select: { date: true } },
        },
      }),
    ]);

  const proteinTarget = profile?.proteinTargetG ?? 150;
  const dayProtein = new Map<string, number>();
  for (const item of proteinItems) {
    const key = item.meal.date.toISOString().slice(0, 10);
    const serving = item.foodItem.servingG || 100;
    const protein = (item.foodItem.proteinG * item.quantityG) / serving;
    dayProtein.set(key, (dayProtein.get(key) ?? 0) + protein);
  }
  const proteinDaysTotal = dayProtein.size;
  const proteinDaysOnTarget = [...dayProtein.values()].filter(
    (p) => p >= proteinTarget * 0.9
  ).length;

  const thisMonthEntries = entries.filter((e) => e.date >= monthStart && e.weightKg);
  const lastMonthEntries = entries.filter(
    (e) => e.date >= lastMonthStart && e.date < monthStart && e.weightKg
  );
  let weightChangeMonthKg: number | null = null;
  if (thisMonthEntries.length && lastMonthEntries.length) {
    const first = lastMonthEntries[0].weightKg!;
    const last = thisMonthEntries[thisMonthEntries.length - 1].weightKg!;
    weightChangeMonthKg = Math.round((last - first) * 10) / 10;
  } else if (thisMonthEntries.length >= 2) {
    const first = thisMonthEntries[0].weightKg!;
    const last = thisMonthEntries[thisMonthEntries.length - 1].weightKg!;
    weightChangeMonthKg = Math.round((last - first) * 10) / 10;
  }

  const summaryLines: string[] = [];

  if (weightChangeMonthKg != null) {
    summaryLines.push(
      `Gewicht ${weightChangeMonthKg > 0 ? "+" : ""}${weightChangeMonthKg}kg im Monatsvergleich`
    );
  } else if (profile?.weightKg) {
    summaryLines.push(`Aktuelles Gewicht: ${profile.weightKg} kg`);
  }

  if (sessionsThisMonth > sessionsLastMonth) {
    summaryLines.push("Trainingsleistung verbessert");
  } else if (sessionsThisMonth > 0) {
    summaryLines.push(`${sessionsThisMonth} Trainings diesen Monat`);
  }

  if (proteinDaysTotal > 0) {
    summaryLines.push(
      `Proteinziele an ${proteinDaysOnTarget} von ${proteinDaysTotal} Tagen erreicht`
    );
  }

  if (summaryLines.length === 0) {
    summaryLines.push("Tracke Gewicht, Training und Ernährung für KI-Analysen.");
  }

  return {
    summaryLines,
    weightChangeMonthKg,
    workoutsThisMonth: sessionsThisMonth,
    workoutsLastMonth: sessionsLastMonth,
    proteinDaysOnTarget,
    proteinDaysTotal,
  };
}
