import { prisma } from "@/lib/prisma";
import {
  startOfWeek,
  startOfMonth,
  format,
  eachDayOfInterval,
  endOfMonth,
  subDays,
} from "date-fns";
import { de } from "date-fns/locale";

export type GymCheckInStats = {
  daysThisWeek: number;
  daysThisMonth: number;
  currentStreak: number;
  longestStreak: number;
  plannedThisMonth: number;
  completedThisMonth: number;
  quotaPercent: number;
  calendarDays: { date: string; label: string; trained: boolean }[];
};

export async function buildGymCheckInStats(userId: string): Promise<GymCheckInStats> {
  const now = new Date();
  const weekStart = startOfWeek(now, { weekStartsOn: 1 });
  const monthStart = startOfMonth(now);
  const monthEnd = endOfMonth(now);
  const rangeStart = subDays(monthStart, 0);

  const [sessions, streakRow, profile] = await Promise.all([
    prisma.workoutSession.findMany({
      where: {
        userId,
        status: "COMPLETED",
        completedAt: { gte: rangeStart, lte: monthEnd },
      },
      select: { completedAt: true },
    }),
    prisma.trainingStreak.findUnique({ where: { userId } }),
    prisma.profile.findUnique({
      where: { userId },
      select: { workoutDaysPerWeek: true },
    }),
  ]);

  const trainedDates = new Set(
    sessions
      .filter((s) => s.completedAt)
      .map((s) => format(s.completedAt!, "yyyy-MM-dd"))
  );

  const daysThisWeek = [...trainedDates].filter((d) => {
    const dt = new Date(d);
    return dt >= weekStart;
  }).length;

  const daysThisMonth = [...trainedDates].filter((d) => {
    const dt = new Date(d);
    return dt >= monthStart;
  }).length;

  const plannedPerWeek = profile?.workoutDaysPerWeek ?? 4;
  const weeksInMonth = Math.ceil(
    eachDayOfInterval({ start: monthStart, end: monthEnd }).length / 7
  );
  const plannedThisMonth = plannedPerWeek * weeksInMonth;
  const completedThisMonth = daysThisMonth;
  const quotaPercent =
    plannedThisMonth > 0
      ? Math.min(100, Math.round((completedThisMonth / plannedThisMonth) * 100))
      : 0;

  const calendarDays = eachDayOfInterval({ start: monthStart, end: monthEnd }).map((d) => {
    const key = format(d, "yyyy-MM-dd");
    return {
      date: key,
      label: format(d, "d", { locale: de }),
      trained: trainedDates.has(key),
    };
  });

  return {
    daysThisWeek,
    daysThisMonth,
    currentStreak: streakRow?.currentDays ?? 0,
    longestStreak: streakRow?.longestDays ?? 0,
    plannedThisMonth,
    completedThisMonth,
    quotaPercent,
    calendarDays,
  };
}
