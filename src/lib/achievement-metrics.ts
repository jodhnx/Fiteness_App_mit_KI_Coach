import { prisma } from "@/lib/prisma";
import { startOfDay, subDays } from "date-fns";

export type AchievementMetrics = Record<string, number>;

export async function loadAchievementMetrics(userId: string): Promise<AchievementMetrics> {
  const today = startOfDay(new Date());
  const weekAgo = subDays(today, 7);
  const since30 = subDays(today, 29);

  const [
    workoutsCompleted,
    trainingStreak,
    activeStreak,
    mealsLogged,
    activitiesCompleted,
    prCount,
    challengesCompleted,
    weightLogs,
    coachMessages,
    volumeSum,
    durationAgg,
    stepsAgg,
    stepsWeekRows,
    sleep8h,
    firstWeight,
    latestWeight,
    profile,
    waterLogs,
    mealItems30,
  ] = await Promise.all([
    prisma.workoutSession.count({ where: { userId, status: "COMPLETED" } }),
    prisma.trainingStreak.findUnique({ where: { userId }, select: { currentDays: true } }),
    prisma.streak.findUnique({ where: { userId }, select: { currentDays: true } }),
    prisma.mealItem.count({ where: { meal: { userId } } }),
    prisma.enduranceActivity.count({ where: { userId } }).catch(() => 0),
    prisma.personalRecord.count({ where: { userId } }).catch(() => 0),
    prisma.userChallenge.count({ where: { userId, status: "COMPLETED" } }),
    prisma.progressEntry.count({ where: { userId, weightKg: { not: null } } }),
    prisma.aIChatMessage.count({ where: { chat: { userId }, role: "user" } }),
    prisma.$queryRaw<[{ vol: number | null }]>`
      SELECT COALESCE(SUM(COALESCE(ws."weightKg", 0) * COALESCE(ws."reps", 0)), 0)::float AS vol
      FROM "WorkoutSet" ws
      INNER JOIN "WorkoutSession" s ON ws."workoutSessionId" = s.id
      WHERE s."userId" = ${userId} AND s.status = 'COMPLETED'
    `.catch(() => [{ vol: 0 }]),
    prisma.workoutSession.aggregate({
      where: { userId, status: "COMPLETED" },
      _sum: { durationSec: true },
    }),
    prisma.dailyHealthMetric.aggregate({
      where: { userId },
      _sum: { steps: true },
      _max: { steps: true },
    }),
    prisma.dailyHealthMetric.findMany({
      where: { userId, date: { gte: weekAgo } },
      select: { steps: true },
    }),
    prisma.dailyHealthMetric
      .count({
        where: { userId, sleepHours: { gte: 8 } },
      })
      .catch(() => 0),
    prisma.progressEntry.findFirst({
      where: { userId, weightKg: { not: null } },
      orderBy: { date: "asc" },
      select: { weightKg: true },
    }),
    prisma.progressEntry.findFirst({
      where: { userId, weightKg: { not: null } },
      orderBy: { date: "desc" },
      select: { weightKg: true },
    }),
    prisma.profile.findUnique({
      where: { userId },
      select: {
        proteinTargetG: true,
        calorieTarget: true,
        weightKg: true,
      },
    }),
    prisma.waterLog.findMany({
      where: { userId, date: { gte: since30 } },
      select: { date: true, amountMl: true },
    }),
    prisma.mealItem.findMany({
      where: { meal: { userId, date: { gte: since30 } } },
      select: {
        quantityG: true,
        foodItem: { select: { proteinG: true, calories: true, servingG: true } },
        meal: { select: { date: true } },
      },
    }),
  ]);

  const proteinTarget = profile?.proteinTargetG ?? 150;
  const calorieTarget = profile?.calorieTarget ?? 2200;

  const proteinByDay = macroDaysOnTarget(mealItems30, proteinTarget, "protein");
  const calorieByDay = macroDaysOnTarget(mealItems30, calorieTarget, "calories");

  const waterByDay = new Map<string, number>();
  for (const w of waterLogs) {
    const k = w.date.toISOString().slice(0, 10);
    waterByDay.set(k, (waterByDay.get(k) ?? 0) + w.amountMl);
  }
  const water3lDays = [...waterByDay.values()].filter((ml) => ml >= 3000).length;

  const stepsWeekMax = stepsWeekRows.reduce((m, r) => Math.max(m, r.steps), 0);
  const stepsWeekSum = stepsWeekRows.reduce((s, r) => s + r.steps, 0);

  const startKg = firstWeight?.weightKg ?? profile?.weightKg ?? null;
  const currentKg = latestWeight?.weightKg ?? profile?.weightKg ?? null;
  let weightLost = 0;
  let weightGained = 0;
  if (startKg != null && currentKg != null) {
    const diff = startKg - currentKg;
    if (diff > 0) weightLost = Math.round(diff * 10) / 10;
    else weightGained = Math.round(-diff * 10) / 10;
  }

  return {
    workouts_completed: workoutsCompleted,
    training_streak_days: trainingStreak?.currentDays ?? 0,
    active_streak_days: activeStreak?.currentDays ?? 0,
    meals_logged: mealsLogged,
    activities_completed: activitiesCompleted,
    personal_records: prCount,
    challenges_completed: challengesCompleted,
    weight_logs: weightLogs,
    coach_messages: coachMessages,
    training_volume_kg: Math.floor(Number(volumeSum[0]?.vol ?? 0)),
    training_minutes: Math.floor((durationAgg._sum.durationSec ?? 0) / 60),
    fiber_goal_days: 0,
    steps_total: stepsAgg._sum.steps ?? 0,
    steps_single_day: stepsAgg._max.steps ?? 0,
    steps_week_max: stepsWeekMax,
    steps_week_sum: stepsWeekSum,
    sleep_8h_nights: sleep8h,
    weight_lost_kg: Math.floor(weightLost),
    weight_gained_kg: Math.floor(weightGained),
    protein_goal_days_streak: maxStreakFromDayFlags(proteinByDay),
    calorie_goal_days: countDayFlags(calorieByDay),
    water_3l_days: water3lDays,
    protein_goal_days_week: countDayFlags(proteinByDay.filter((_, i) => i < 7)),
  };
}

function macroDaysOnTarget(
  items: {
    quantityG: number;
    foodItem: { proteinG: number; calories: number; servingG: number };
    meal: { date: Date };
  }[],
  target: number,
  kind: "protein" | "calories"
): boolean[] {
  const byDay = new Map<string, number>();
  for (const i of items) {
    const key = i.meal.date.toISOString().slice(0, 10);
    const s = i.foodItem.servingG || 100;
    const factor = i.quantityG / s;
    const add =
      kind === "protein"
        ? i.foodItem.proteinG * factor
        : i.foodItem.calories * factor;
    byDay.set(key, (byDay.get(key) ?? 0) + add);
  }
  const sorted = [...byDay.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  return sorted.map(([, v]) => v >= target * 0.92);
}

function countDayFlags(flags: boolean[]): number {
  return flags.filter(Boolean).length;
}

function maxStreakFromDayFlags(flags: boolean[]): number {
  let best = 0;
  let cur = 0;
  for (const f of flags) {
    if (f) {
      cur++;
      best = Math.max(best, cur);
    } else cur = 0;
  }
  return best;
}
