import { prisma } from "@/lib/prisma";
import { safePrisma } from "@/lib/prisma-safe";
import { differenceInCalendarDays, startOfDay, subDays } from "date-fns";

export type NutritionStreakSnapshot = {
  currentDays: number;
  longestDays: number;
  lastTrackedAt: Date | null;
};

/** Streak stays visible until a full untracked calendar day passes. */
export function effectiveNutritionStreakDays(
  row: NutritionStreakSnapshot | null | undefined,
  now = new Date()
): number {
  if (!row) return 0;
  if (!row.lastTrackedAt) return row.currentDays;
  const today = startOfDay(now);
  const last = startOfDay(row.lastTrackedAt);
  const gap = differenceInCalendarDays(today, last);
  if (gap <= 1) return row.currentDays;
  return 0;
}

/**
 * Increment at most once per calendar day when the user tracks a meal.
 */
const EMPTY_STREAK: NutritionStreakSnapshot = {
  currentDays: 0,
  longestDays: 0,
  lastTrackedAt: null,
};

async function updateNutritionStreakUnsafe(
  userId: string,
  trackedAt: Date
): Promise<NutritionStreakSnapshot> {
  const today = startOfDay(trackedAt);
  let row = await prisma.nutritionStreak.findUnique({ where: { userId } });

  if (!row) {
    row = await prisma.nutritionStreak.create({
      data: {
        userId,
        currentDays: 1,
        longestDays: 1,
        lastTrackedAt: today,
      },
    });
    return row;
  }

  const last = row.lastTrackedAt ? startOfDay(row.lastTrackedAt) : null;
  if (last && last.getTime() === today.getTime()) {
    return row;
  }

  if (last) {
    const gap = differenceInCalendarDays(today, last);
    if (gap === 1) {
      const currentDays = row.currentDays + 1;
      return prisma.nutritionStreak.update({
        where: { userId },
        data: {
          currentDays,
          longestDays: Math.max(row.longestDays, currentDays),
          lastTrackedAt: today,
        },
      });
    }
  }

  return prisma.nutritionStreak.update({
    where: { userId },
    data: {
      currentDays: 1,
      lastTrackedAt: today,
    },
  });
}

async function backfillNutritionStreakFromMeals(userId: string) {
  const since = subDays(startOfDay(new Date()), 400);
  const meals = await prisma.meal.findMany({
    where: { userId, date: { gte: since } },
    select: { date: true },
    orderBy: { date: "asc" },
  });

  const dayKeys = [...new Set(meals.map((m) => startOfDay(m.date).toISOString()))].sort();
  if (!dayKeys.length) {
    return prisma.nutritionStreak.create({
      data: { userId, currentDays: 0, longestDays: 0, lastTrackedAt: null },
    });
  }

  let longest = 1;
  let run = 1;
  for (let i = 1; i < dayKeys.length; i++) {
    const prev = new Date(dayKeys[i - 1]);
    const next = new Date(dayKeys[i]);
    if (differenceInCalendarDays(next, prev) === 1) {
      run++;
      longest = Math.max(longest, run);
    } else {
      run = 1;
    }
  }

  const lastTrackedAt = startOfDay(new Date(dayKeys[dayKeys.length - 1]));
  let currentDays = 1;
  run = 1;
  for (let i = dayKeys.length - 2; i >= 0; i--) {
    const prev = new Date(dayKeys[i]);
    const next = new Date(dayKeys[i + 1]);
    if (differenceInCalendarDays(next, prev) === 1) {
      run++;
    } else {
      break;
    }
  }
  currentDays = run;

  return prisma.nutritionStreak.create({
    data: {
      userId,
      currentDays,
      longestDays: longest,
      lastTrackedAt,
    },
  });
}

/**
 * Tracking a meal must not fail when the streak table is unavailable —
 * the meal itself is already persisted at this point.
 */
export async function updateNutritionStreak(
  userId: string,
  trackedAt = new Date()
): Promise<NutritionStreakSnapshot> {
  return safePrisma(
    () => updateNutritionStreakUnsafe(userId, trackedAt),
    EMPTY_STREAK,
    { logLabel: "updateNutritionStreak" }
  );
}

async function loadNutritionStreakUnsafe(
  userId: string
): Promise<NutritionStreakSnapshot & { effectiveDays: number }> {
  let row = await prisma.nutritionStreak.findUnique({ where: { userId } });
  if (!row) {
    row = await backfillNutritionStreakFromMeals(userId).catch(() => null);
  }
  if (!row) {
    return { currentDays: 0, longestDays: 0, lastTrackedAt: null, effectiveDays: 0 };
  }
  return {
    currentDays: row.currentDays,
    longestDays: row.longestDays,
    lastTrackedAt: row.lastTrackedAt,
    effectiveDays: effectiveNutritionStreakDays(row),
  };
}

export async function loadNutritionStreak(
  userId: string
): Promise<NutritionStreakSnapshot & { effectiveDays: number }> {
  return safePrisma(
    () => loadNutritionStreakUnsafe(userId),
    { ...EMPTY_STREAK, effectiveDays: 0 },
    { logLabel: "loadNutritionStreak" }
  );
}
