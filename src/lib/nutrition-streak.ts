import { prisma } from "@/lib/prisma";
import { safePrisma } from "@/lib/prisma-safe";
import { differenceInCalendarDays } from "date-fns";
import { formatNutritionDayUtc, nutritionDayKey, nutritionDayUtc } from "@/lib/nutrition-day";

export type NutritionStreakSnapshot = {
  currentDays: number;
  longestDays: number;
  lastTrackedAt: Date | null;
};

/** Calendar YMD for a meal date stored as UTC midnight of that day. */
function mealDayYmd(d: Date): string {
  return formatNutritionDayUtc(d);
}

function ymdToUtcDate(ymd: string): Date {
  return nutritionDayUtc(ymd);
}

function gapBetweenYmd(later: string, earlier: string): number {
  return differenceInCalendarDays(ymdToUtcDate(later), ymdToUtcDate(earlier));
}

/**
 * Streak stays visible until a full untracked calendar day passes.
 * Uses UTC-midnight meal dates + optional "today" YMD (user-local).
 */
export function effectiveNutritionStreakDays(
  row: NutritionStreakSnapshot | null | undefined,
  now = new Date(),
  todayYmd = nutritionDayKey(now)
): number {
  if (!row) return 0;
  if (!row.lastTrackedAt) return row.currentDays;
  const lastYmd = mealDayYmd(row.lastTrackedAt);
  const gap = gapBetweenYmd(todayYmd, lastYmd);
  if (gap <= 1) return row.currentDays;
  return 0;
}

/**
 * Pure streak math from sorted unique day ISO keys (yyyy-MM-dd or UTC midnight ISO).
 * Exported for unit tests.
 */
export function computeStreakFromDayKeys(dayKeys: string[]): {
  currentDays: number;
  longestDays: number;
  lastTrackedAt: Date | null;
} {
  const ymds = [
    ...new Set(
      dayKeys
        .map((k) => (k.length >= 10 ? k.slice(0, 10) : k))
        .filter((k) => /^\d{4}-\d{2}-\d{2}$/.test(k))
    ),
  ].sort();

  if (!ymds.length) {
    return { currentDays: 0, longestDays: 0, lastTrackedAt: null };
  }

  let longest = 1;
  let run = 1;
  for (let i = 1; i < ymds.length; i++) {
    if (gapBetweenYmd(ymds[i], ymds[i - 1]) === 1) {
      run++;
      longest = Math.max(longest, run);
    } else {
      run = 1;
    }
  }

  const lastTrackedAt = ymdToUtcDate(ymds[ymds.length - 1]);
  run = 1;
  for (let i = ymds.length - 2; i >= 0; i--) {
    if (gapBetweenYmd(ymds[i + 1], ymds[i]) === 1) {
      run++;
    } else {
      break;
    }
  }

  return {
    currentDays: run,
    longestDays: longest,
    lastTrackedAt,
  };
}

/** Increment at most once per calendar day when the user tracks a meal. */
const EMPTY_STREAK: NutritionStreakSnapshot = {
  currentDays: 0,
  longestDays: 0,
  lastTrackedAt: null,
};

async function updateNutritionStreakUnsafe(
  userId: string,
  trackedAt: Date
): Promise<NutritionStreakSnapshot> {
  const todayYmd = mealDayYmd(trackedAt);
  const today = ymdToUtcDate(todayYmd);
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

  const lastYmd = row.lastTrackedAt ? mealDayYmd(row.lastTrackedAt) : null;
  if (lastYmd && lastYmd === todayYmd) {
    return row;
  }

  if (lastYmd) {
    const gap = gapBetweenYmd(todayYmd, lastYmd);
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

async function listTrackedDayKeys(userId: string): Promise<string[]> {
  const since = new Date(Date.now() - 400 * 24 * 60 * 60 * 1000);
  const [meals, sessions] = await Promise.all([
    prisma.meal.findMany({
      where: {
        userId,
        date: { gte: since },
        items: { some: {} },
      },
      select: { date: true },
      orderBy: { date: "asc" },
    }),
    prisma.workoutSession.findMany({
      where: {
        userId,
        status: "COMPLETED",
        completedAt: { gte: since },
      },
      select: { completedAt: true },
      orderBy: { completedAt: "asc" },
    }),
  ]);

  const keys = [
    ...meals.map((m) => mealDayYmd(m.date)),
    ...sessions
      .map((s) => (s.completedAt ? mealDayYmd(s.completedAt) : null))
      .filter((k): k is string => Boolean(k)),
  ];
  return [...new Set(keys)].sort();
}

/**
 * Pure helper for tests: merge food + training day keys then compute streak.
 * App open / settings / navigation must NOT contribute days.
 */
export function computeActivityStreakFromDayKeys(dayKeys: string[]) {
  return computeStreakFromDayKeys(dayKeys);
}

async function backfillNutritionStreakFromMeals(userId: string) {
  const dayKeys = await listTrackedDayKeys(userId);
  const computed = computeStreakFromDayKeys(dayKeys);
  return prisma.nutritionStreak.create({
    data: {
      userId,
      currentDays: computed.currentDays,
      longestDays: computed.longestDays,
      lastTrackedAt: computed.lastTrackedAt,
    },
  });
}

async function recomputeNutritionStreakUnsafe(
  userId: string
): Promise<NutritionStreakSnapshot> {
  const dayKeys = await listTrackedDayKeys(userId);
  const computed = computeStreakFromDayKeys(dayKeys);
  const existing = await prisma.nutritionStreak.findUnique({ where: { userId } });
  const longestDays = Math.max(existing?.longestDays ?? 0, computed.longestDays);

  if (!existing) {
    return prisma.nutritionStreak.create({
      data: {
        userId,
        currentDays: computed.currentDays,
        longestDays,
        lastTrackedAt: computed.lastTrackedAt,
      },
    });
  }

  return prisma.nutritionStreak.update({
    where: { userId },
    data: {
      currentDays: computed.currentDays,
      longestDays,
      lastTrackedAt: computed.lastTrackedAt,
    },
  });
}

/**
 * Recompute streak after deletes so an emptied calendar day does not keep
 * inflating effectiveDays. Server remains source of truth.
 */
export async function recomputeNutritionStreak(
  userId: string
): Promise<NutritionStreakSnapshot & { effectiveDays: number }> {
  const row = await safePrisma(
    () => recomputeNutritionStreakUnsafe(userId),
    EMPTY_STREAK,
    { logLabel: "recomputeNutritionStreak" }
  );
  return {
    ...row,
    effectiveDays: effectiveNutritionStreakDays(row),
  };
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
  userId: string,
  opts?: { skipBackfill?: boolean; todayYmd?: string }
): Promise<NutritionStreakSnapshot & { effectiveDays: number }> {
  let row = await prisma.nutritionStreak.findUnique({ where: { userId } });
  if (!row && !opts?.skipBackfill) {
    row = await backfillNutritionStreakFromMeals(userId).catch(() => null);
  }
  if (!row) {
    return { currentDays: 0, longestDays: 0, lastTrackedAt: null, effectiveDays: 0 };
  }
  return {
    currentDays: row.currentDays,
    longestDays: row.longestDays,
    lastTrackedAt: row.lastTrackedAt,
    effectiveDays: effectiveNutritionStreakDays(
      row,
      new Date(),
      opts?.todayYmd
    ),
  };
}

export async function loadNutritionStreak(
  userId: string,
  opts?: { skipBackfill?: boolean; todayYmd?: string }
): Promise<NutritionStreakSnapshot & { effectiveDays: number }> {
  return safePrisma(
    () => loadNutritionStreakUnsafe(userId, opts),
    { ...EMPTY_STREAK, effectiveDays: 0 },
    { logLabel: "loadNutritionStreak" }
  );
}
