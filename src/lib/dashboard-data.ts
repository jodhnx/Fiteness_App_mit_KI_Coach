import { prisma } from "@/lib/prisma";
import { calculateBMI, bmiCategory } from "@/lib/utils";
import { getUserTotalXP } from "@/lib/gamification";
import {
  startOfDay,
  startOfWeek,
  startOfMonth,
  subDays,
  format,
} from "date-fns";
import { de } from "date-fns/locale";

const EMPTY_DASHBOARD_STATS = {
  bmi: null as number | null,
  bmiCategory: null as string | null,
  weightKg: null as number | null,
  weightTrend: [] as { label: string; value: number }[],
  caloriesIntake: 0,
  calorieTarget: 0,
  caloriesBurned: 0,
  trainingVolume: 0,
  sessionsWeek: 0,
  sessionsMonth: 0,
  xp: 0,
  levels: [] as { id: number; name: string; minXP: number }[],
  streak: null as { currentDays: number; longestDays: number } | null,
  last7: [] as string[],
  calorieChart: [] as { label: string; value: number }[],
  macros: { protein: 150, carbs: 200, fat: 65 },
  trainingStreak: null as { currentDays: number } | null,
  lastWorkout: null as { name: string; completedAt: Date } | null,
  activePlan: null as {
    id: string;
    name: string;
    days: { id: string; name: string; _count: { exercises: number } }[];
  } | null,
  recentPRs: [] as {
    recordType: string;
    value: number;
    exercise: { name: string };
  }[],
  activeSession: null as { id: string } | null,
};

export async function loadDashboardStats(userId: string) {
  try {
  const today = startOfDay(new Date());
  const weekStart = startOfWeek(today, { weekStartsOn: 1 });
  const monthStart = startOfMonth(today);
  const weekAgo = subDays(today, 6);

  const [
    profile,
    latestProgress,
    weightHistory,
    mealsWeek,
    sessionsWeek,
    sessionsMonth,
    xp,
    streak,
    trainingStreak,
    lastWorkout,
    activePlan,
    recentPRs,
    activeSession,
    levels,
  ] = await Promise.all([
    prisma.profile.findUnique({
      where: { userId },
      select: {
        weightKg: true,
        heightCm: true,
        calorieTarget: true,
        proteinTargetG: true,
        carbsTargetG: true,
        fatTargetG: true,
      },
    }),
    prisma.progressEntry.findFirst({
      where: { userId, weightKg: { not: null } },
      orderBy: { date: "desc" },
      select: { weightKg: true },
    }),
    prisma.progressEntry.findMany({
      where: { userId, weightKg: { not: null } },
      orderBy: { date: "asc" },
      take: 30,
      select: { date: true, weightKg: true },
    }),
    prisma.meal.findMany({
      where: { userId, date: { gte: weekAgo, lte: today } },
      select: {
        date: true,
        items: {
          select: {
            quantityG: true,
            foodItem: { select: { calories: true, servingG: true } },
          },
        },
      },
    }),
    prisma.workoutSession.findMany({
      where: { userId, startedAt: { gte: weekStart } },
      select: {
        caloriesBurned: true,
        sets: {
          select: { reps: true, weightKg: true, completed: true },
        },
      },
    }),
    prisma.workoutSession.count({
      where: { userId, startedAt: { gte: monthStart } },
    }),
    getUserTotalXP(userId),
    prisma.streak.findUnique({
      where: { userId },
      select: { currentDays: true, longestDays: true },
    }),
    prisma.trainingStreak.findUnique({
      where: { userId },
      select: { currentDays: true },
    }),
    prisma.workoutSession.findFirst({
      where: { userId, status: "COMPLETED" },
      orderBy: { completedAt: "desc" },
      select: { name: true, completedAt: true },
    }),
    prisma.workoutPlan.findFirst({
      where: { userId, archivedAt: null, isActive: true },
      select: {
        id: true,
        name: true,
        days: {
          orderBy: { dayOrder: "asc" },
          take: 1,
          select: {
            id: true,
            name: true,
            _count: { select: { exercises: true } },
          },
        },
      },
    }),
    prisma.personalRecord.findMany({
      where: { userId },
      orderBy: { achievedAt: "desc" },
      take: 3,
      select: {
        recordType: true,
        value: true,
        exercise: { select: { name: true } },
      },
    }),
    prisma.workoutSession.findFirst({
      where: { userId, status: "IN_PROGRESS" },
      select: { id: true },
    }),
    prisma.level.findMany({
      orderBy: { minXP: "asc" },
      select: { id: true, name: true, minXP: true },
    }),
  ]);

  const mealsToday = mealsWeek.filter(
    (m) => format(m.date, "yyyy-MM-dd") === format(today, "yyyy-MM-dd")
  );
  let caloriesIntake = 0;
  for (const meal of mealsToday) {
    for (const item of meal.items) {
      const ratio = item.quantityG / item.foodItem.servingG;
      caloriesIntake += item.foodItem.calories * ratio;
    }
  }

  const calorieByDay = new Map<string, number>();
  for (const meal of mealsWeek) {
    const key = format(meal.date, "EEE", { locale: de });
    let cal = calorieByDay.get(key) ?? 0;
    for (const item of meal.items) {
      const ratio = item.quantityG / item.foodItem.servingG;
      cal += item.foodItem.calories * ratio;
    }
    calorieByDay.set(key, cal);
  }

  const last7 = Array.from({ length: 7 }, (_, i) =>
    format(subDays(today, 6 - i), "EEE", { locale: de })
  );
  const calorieChart = last7.map((label) => ({
    label,
    value: Math.round(calorieByDay.get(label) ?? 0),
  }));

  let caloriesBurned = 0;
  let trainingVolume = 0;
  for (const w of sessionsWeek) {
    caloriesBurned += w.caloriesBurned ?? 0;
    for (const set of w.sets) {
      if (set.completed) {
        trainingVolume += (set.reps ?? 0) * (set.weightKg ?? 0);
      }
    }
  }

  const weightKg = latestProgress?.weightKg ?? profile?.weightKg;
  const heightCm = profile?.heightCm;
  const bmi = weightKg && heightCm ? calculateBMI(weightKg, heightCm) : null;

  return {
    bmi,
    bmiCategory: bmi ? bmiCategory(bmi) : null,
    weightKg,
    weightTrend: weightHistory
      .filter((e) => e.weightKg != null)
      .map((e) => ({
        label: format(e.date, "dd.MM"),
        value: e.weightKg as number,
      })),
    caloriesIntake: Math.round(caloriesIntake),
    calorieTarget: profile?.calorieTarget ?? 0,
    caloriesBurned,
    trainingVolume: Math.round(trainingVolume),
    sessionsWeek: sessionsWeek.length,
    sessionsMonth,
    xp,
    levels,
    streak,
    last7,
    calorieChart,
    macros: {
      protein: profile?.proteinTargetG,
      carbs: profile?.carbsTargetG,
      fat: profile?.fatTargetG,
    },
    trainingStreak,
    lastWorkout,
    activePlan,
    recentPRs,
    activeSession,
  };
  } catch (e) {
    console.error("[dashboard-data] loadDashboardStats failed", e);
    return { ...EMPTY_DASHBOARD_STATS };
  }
}
