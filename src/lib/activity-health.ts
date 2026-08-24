import { prisma } from "@/lib/prisma";
import { calculateBMR } from "@/lib/nutrition";
import type { EnduranceActivityType, Gender } from "@prisma/client";
import {
  addDays,
  format,
  startOfDay,
  startOfMonth,
  startOfWeek,
  subDays,
} from "date-fns";
import { de } from "date-fns/locale";

export type HealthGoals = {
  dailyStepGoal: number;
  activeMinuteGoal: number;
  moveCalorieGoal: number;
};

export type CalorieBurnBreakdown = {
  bmr: number;
  bmrToday: number;
  activityCalories: number;
  stepCalories: number;
  totalBurned: number;
};

export type ActivityPersonalRecords = {
  fastest5kmSec: number | null;
  fastest10kmSec: number | null;
  longestActivitySec: number | null;
  longestDistanceM: number | null;
  bestWeekDistanceM: number;
  bestWeekCount: number;
};

const DEFAULT_GOALS: HealthGoals = {
  dailyStepGoal: 10000,
  activeMinuteGoal: 30,
  moveCalorieGoal: 500,
};

export function estimateStepCalories(steps: number, weightKg: number | null): number {
  if (steps <= 0) return 0;
  const w = weightKg && weightKg > 0 ? weightKg : 70;
  return Math.round(steps * 0.04 * (w / 70));
}

export function estimateActiveMinutesFromSteps(steps: number): number {
  return Math.round(steps / 100);
}

function paceSecPerKm(distanceM: number, durationSec: number): number | null {
  if (!distanceM || distanceM < 1000 || durationSec <= 0) return null;
  return durationSec / (distanceM / 1000);
}

export function computePersonalRecords(
  activities: {
    type: EnduranceActivityType;
    durationSec: number;
    distanceM: number | null;
    startedAt: Date;
  }[]
): ActivityPersonalRecords {
  const runTypes: EnduranceActivityType[] = ["RUNNING", "JOGGING"];
  let fastest5kmSec: number | null = null;
  let fastest10kmSec: number | null = null;
  let longestActivitySec = 0;
  let longestDistanceM = 0;

  for (const a of activities) {
    if (a.durationSec > longestActivitySec) longestActivitySec = a.durationSec;
    if ((a.distanceM ?? 0) > longestDistanceM) longestDistanceM = a.distanceM ?? 0;

    if (!runTypes.includes(a.type) || !a.distanceM) continue;
    const pace = paceSecPerKm(a.distanceM, a.durationSec);
    if (!pace) continue;
    if (a.distanceM >= 5000) {
      const projected5 = pace * 5;
      if (fastest5kmSec == null || projected5 < fastest5kmSec) fastest5kmSec = Math.round(projected5);
    }
    if (a.distanceM >= 10000) {
      const projected10 = pace * 10;
      if (fastest10kmSec == null || projected10 < fastest10kmSec) fastest10kmSec = Math.round(projected10);
    }
  }

  const weekMap = new Map<string, { distanceM: number; count: number }>();
  for (const a of activities) {
    const key = format(startOfWeek(a.startedAt, { weekStartsOn: 1 }), "yyyy-MM-dd");
    const cur = weekMap.get(key) ?? { distanceM: 0, count: 0 };
    cur.distanceM += a.distanceM ?? 0;
    cur.count += 1;
    weekMap.set(key, cur);
  }
  let bestWeekDistanceM = 0;
  let bestWeekCount = 0;
  for (const w of weekMap.values()) {
    if (w.distanceM > bestWeekDistanceM) bestWeekDistanceM = w.distanceM;
    if (w.count > bestWeekCount) bestWeekCount = w.count;
  }

  return {
    fastest5kmSec,
    fastest10kmSec,
    longestActivitySec: longestActivitySec > 0 ? longestActivitySec : null,
    longestDistanceM: longestDistanceM > 0 ? longestDistanceM : null,
    bestWeekDistanceM,
    bestWeekCount,
  };
}

/**
 * Probes the full row on purpose: selecting only `id` would still succeed
 * when columns are missing, so callers would run into P2022 later.
 */
async function healthTableAvailable(): Promise<boolean> {
  try {
    await prisma.dailyHealthMetric.findFirst();
    return true;
  } catch {
    return false;
  }
}

export async function getHealthGoals(userId: string): Promise<HealthGoals> {
  const profile = await prisma.profile.findUnique({
    where: { userId },
    select: { dailyStepGoal: true, activeMinuteGoal: true, moveCalorieGoal: true },
  });
  return {
    dailyStepGoal: profile?.dailyStepGoal ?? DEFAULT_GOALS.dailyStepGoal,
    activeMinuteGoal: profile?.activeMinuteGoal ?? DEFAULT_GOALS.activeMinuteGoal,
    moveCalorieGoal: profile?.moveCalorieGoal ?? DEFAULT_GOALS.moveCalorieGoal,
  };
}

export async function upsertTodaySteps(
  userId: string,
  steps: number,
  extra?: { activeMinutes?: number; distanceM?: number }
) {
  if (!(await healthTableAvailable())) {
    throw new Error("Health-Metriken nicht verfügbar — Migration ausführen");
  }
  const today = startOfDay(new Date());
  const profile = await prisma.profile.findUnique({
    where: { userId },
    select: { weightKg: true },
  });
  const weight = profile?.weightKg ?? null;
  const existing = await prisma.dailyHealthMetric.findUnique({
    where: { userId_date: { userId, date: today } },
  });
  const stepCal = estimateStepCalories(steps, weight);
  const prevStepCal = estimateStepCalories(existing?.steps ?? 0, weight);
  const activityCal = Math.max(0, (existing?.caloriesBurned ?? 0) - prevStepCal);

  return prisma.dailyHealthMetric.upsert({
    where: { userId_date: { userId, date: today } },
    create: {
      userId,
      date: today,
      steps,
      activeMinutes: extra?.activeMinutes ?? estimateActiveMinutesFromSteps(steps),
      distanceM: extra?.distanceM ?? 0,
      caloriesBurned: stepCal,
    },
    update: {
      steps,
      activeMinutes:
        extra?.activeMinutes ??
        Math.max(existing?.activeMinutes ?? 0, estimateActiveMinutesFromSteps(steps)),
      distanceM: extra?.distanceM ?? existing?.distanceM ?? 0,
      caloriesBurned: stepCal + activityCal,
    },
  });
}

export async function mergeActivityIntoTodayHealth(
  userId: string,
  activity: { durationSec: number; distanceM: number | null; caloriesBurned: number | null }
) {
  if (!(await healthTableAvailable())) return;
  const today = startOfDay(new Date());
  const profile = await prisma.profile.findUnique({
    where: { userId },
    select: { weightKg: true },
  });
  const activeMin = Math.round(activity.durationSec / 60);
  const actCal =
    activity.caloriesBurned ??
    Math.round(activeMin * 8 * ((profile?.weightKg ?? 70) / 70));

  await prisma.dailyHealthMetric.upsert({
    where: { userId_date: { userId, date: today } },
    create: {
      userId,
      date: today,
      steps: 0,
      activeMinutes: activeMin,
      distanceM: activity.distanceM ?? 0,
      caloriesBurned: actCal,
    },
    update: {
      activeMinutes: { increment: activeMin },
      distanceM: { increment: activity.distanceM ?? 0 },
      caloriesBurned: { increment: actCal },
    },
  });
}

export async function getCalorieBurnBreakdown(userId: string): Promise<CalorieBurnBreakdown> {
  const profile = await prisma.profile.findUnique({
    where: { userId },
    select: {
      age: true,
      weightKg: true,
      heightCm: true,
      gender: true,
      activityLevel: true,
    },
  });

  let bmr = 1800;
  if (
    profile?.age &&
    profile.weightKg &&
    profile.heightCm &&
    profile.gender
  ) {
    bmr = Math.round(
      calculateBMR(
        profile.weightKg,
        profile.heightCm,
        profile.age,
        profile.gender as Gender
      )
    );
  }

  const bmrToday = Math.round(bmr / 24 * new Date().getHours());

  const today = startOfDay(new Date());
  const healthOk = await healthTableAvailable();

  const [metric, weekActivities] = await Promise.all([
    healthOk
      ? prisma.dailyHealthMetric.findUnique({
          where: { userId_date: { userId, date: today } },
        })
      : Promise.resolve(null),
    prisma.enduranceActivity
      .findMany({
        where: { userId, startedAt: { gte: today } },
        select: { caloriesBurned: true, durationSec: true },
      })
      .catch(() => []),
  ]);

  const steps = metric?.steps ?? 0;
  const stepCalories = estimateStepCalories(steps, profile?.weightKg ?? null);
  const loggedActivityCal = weekActivities.reduce(
    (s, a) => s + (a.caloriesBurned ?? Math.round(a.durationSec / 60 * 7)),
    0
  );
  const metricActivityCal = Math.max(0, (metric?.caloriesBurned ?? 0) - stepCalories);
  const activityCalories = loggedActivityCal + metricActivityCal;

  return {
    bmr,
    bmrToday,
    activityCalories,
    stepCalories,
    totalBurned: bmrToday + activityCalories + stepCalories,
  };
}

export type HealthDashboardPayload = {
  goals: HealthGoals;
  today: {
    steps: number;
    activeMinutes: number;
    distanceM: number;
    caloriesBurned: number;
    stepGoal: number;
    stepStreak: number;
  };
  week: {
    count: number;
    totalDurationSec: number;
    totalDistanceM: number;
    totalCalories: number;
    avgSteps: number;
  };
  month: {
    totalSteps: number;
    avgSteps: number;
    totalDistanceM: number;
  };
  calorieBurn: CalorieBurnBreakdown;
  rings: {
    move: { value: number; goal: number; pct: number };
    exercise: { value: number; goal: number; pct: number };
    steps: { value: number; goal: number; pct: number };
  };
  stepHistory: { label: string; steps: number }[];
  stepStreak: number;
  records: ActivityPersonalRecords;
  chartWeek: { label: string; steps: number; calories: number; distanceKm: number }[];
};

export async function loadHealthDashboard(userId: string): Promise<HealthDashboardPayload> {
  const goals = await getHealthGoals(userId);
  const today = startOfDay(new Date());
  const weekStart = startOfWeek(today, { weekStartsOn: 1 });
  const monthStart = startOfMonth(today);

  const profile = await prisma.profile.findUnique({
    where: { userId },
    select: { weightKg: true },
  });

  const healthOk = await healthTableAvailable();

  const [metric, weekMetrics, monthMetrics, weekActivities, allActivities] =
    await Promise.all([
      healthOk
        ? prisma.dailyHealthMetric.findUnique({
            where: { userId_date: { userId, date: today } },
          })
        : Promise.resolve(null),
      healthOk
        ? prisma.dailyHealthMetric.findMany({
            where: { userId, date: { gte: weekStart } },
            orderBy: { date: "asc" },
          })
        : Promise.resolve([]),
      healthOk
        ? prisma.dailyHealthMetric.findMany({
            where: { userId, date: { gte: monthStart } },
          })
        : Promise.resolve([]),
      prisma.enduranceActivity
        .findMany({
          where: { userId, startedAt: { gte: weekStart } },
        })
        .catch(() => []),
      prisma.enduranceActivity
        .findMany({
          where: { userId },
          orderBy: { startedAt: "desc" },
          take: 200,
        })
        .catch(() => []),
    ]);

  const todayActivityMin = weekActivities
    .filter((a) => a.startedAt >= today)
    .reduce((s, a) => s + Math.round(a.durationSec / 60), 0);
  const todayActivityDist = weekActivities
    .filter((a) => a.startedAt >= today)
    .reduce((s, a) => s + (a.distanceM ?? 0), 0);
  const todayActivityCal = weekActivities
    .filter((a) => a.startedAt >= today)
    .reduce((s, a) => s + (a.caloriesBurned ?? Math.round(a.durationSec / 60 * 7)), 0);

  const steps = metric?.steps ?? 0;
  const activeMinutes = Math.max(metric?.activeMinutes ?? 0, todayActivityMin);
  const distanceM = (metric?.distanceM ?? 0) + todayActivityDist;
  const stepCal = estimateStepCalories(steps, profile?.weightKg ?? null);
  const caloriesBurned = stepCal + todayActivityCal + Math.max(0, (metric?.caloriesBurned ?? 0) - stepCal);

  const weekStepSum = weekMetrics.reduce((s, m) => s + m.steps, 0);
  const weekDays = Math.max(1, weekMetrics.length);
  const monthStepSum = monthMetrics.reduce((s, m) => s + m.steps, 0);
  const monthDays = Math.max(1, monthMetrics.length);

  const weekSummary = {
    count: weekActivities.length,
    totalDurationSec: weekActivities.reduce((s, a) => s + a.durationSec, 0),
    totalDistanceM: weekActivities.reduce((s, a) => s + (a.distanceM ?? 0), 0),
    totalCalories: weekActivities.reduce((s, a) => s + (a.caloriesBurned ?? 0), 0),
    avgSteps: Math.round(weekStepSum / weekDays),
  };

  let stepStreak = 0;
  if (await healthTableAvailable()) {
    const last30 = await prisma.dailyHealthMetric.findMany({
      where: { userId, date: { gte: subDays(today, 30) } },
      orderBy: { date: "desc" },
    });
    for (let i = 0; i < 30; i++) {
      const d = startOfDay(subDays(today, i));
      const row = last30.find((r) => r.date.getTime() === d.getTime());
      if (row && row.steps >= goals.dailyStepGoal * 0.8) stepStreak++;
      else if (i === 0 && steps >= goals.dailyStepGoal * 0.8) stepStreak++;
      else break;
    }
  }

  const stepHistory: { label: string; steps: number }[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = startOfDay(subDays(today, i));
    const row = weekMetrics.find((m) => m.date.getTime() === d.getTime());
    stepHistory.push({
      label: format(d, "EEE", { locale: de }),
      steps: row?.steps ?? (i === 0 ? steps : 0),
    });
  }

  const chartWeek = Array.from({ length: 7 }, (_, i) => {
    const d = startOfDay(addDays(weekStart, i));
    const m = weekMetrics.find((r) => r.date.getTime() === d.getTime());
    const dayActs = weekActivities.filter(
      (a) => startOfDay(a.startedAt).getTime() === d.getTime()
    );
    return {
      label: format(d, "EEE", { locale: de }),
      steps: m?.steps ?? 0,
      calories:
        (m?.caloriesBurned ?? 0) +
        dayActs.reduce((s, a) => s + (a.caloriesBurned ?? 0), 0),
      distanceKm:
        Math.round(
          ((m?.distanceM ?? 0) +
            dayActs.reduce((s, a) => s + (a.distanceM ?? 0), 0)) /
            100
        ) / 10,
    };
  });

  const calorieBurn = await getCalorieBurnBreakdown(userId);
  const moveValue = caloriesBurned;
  const exerciseValue = activeMinutes;

  return {
    goals,
    today: {
      steps,
      activeMinutes,
      distanceM,
      caloriesBurned,
      stepGoal: goals.dailyStepGoal,
      stepStreak,
    },
    week: weekSummary,
    month: {
      totalSteps: monthStepSum,
      avgSteps: Math.round(monthStepSum / monthDays),
      totalDistanceM: monthMetrics.reduce((s, m) => s + m.distanceM, 0),
    },
    calorieBurn,
    rings: {
      move: {
        value: moveValue,
        goal: goals.moveCalorieGoal,
        pct: Math.min(100, Math.round((moveValue / goals.moveCalorieGoal) * 100)),
      },
      exercise: {
        value: exerciseValue,
        goal: goals.activeMinuteGoal,
        pct: Math.min(100, Math.round((exerciseValue / goals.activeMinuteGoal) * 100)),
      },
      steps: {
        value: steps,
        goal: goals.dailyStepGoal,
        pct: Math.min(100, Math.round((steps / goals.dailyStepGoal) * 100)),
      },
    },
    stepHistory,
    stepStreak,
    records: computePersonalRecords(allActivities),
    chartWeek,
  };
}
