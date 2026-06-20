import type { MealType, NutritionGoal, Profile } from "@prisma/client";
import { MEAL_TYPE_LABELS, TRACK_MEAL_ORDER } from "@/lib/meal-types";
import { prisma } from "@/lib/prisma";
import { macrosForQuantity, sumMacros, roundMacros, type MacroTotals } from "@/lib/food-macros";
import {
  nutritionTargetsFromProfile,
  type CaloriePlanContext,
} from "@/lib/calorie-target";
import { trainingGoalFromNutritionGoal } from "@/lib/nutrition";
import { loadCaloriePlanContext } from "@/lib/calorie-health-context";
import { syncProfileTargetsToDb } from "@/lib/profile-targets-sync";
import { startOfDay, subDays, format } from "date-fns";
import { de } from "date-fns/locale";
import {
  createEmptyNutritionDashboard,
  type NutritionDashboardPayload,
} from "@/lib/nutrition-defaults";
import { safePrisma } from "@/lib/prisma-safe";
import { isSchemaMismatchError } from "@/lib/prisma-errors";

const foodSelectFull = {
  id: true,
  slug: true,
  name: true,
  brand: true,
  category: true,
  calories: true,
  proteinG: true,
  carbsG: true,
  fatG: true,
  servingG: true,
  barcode: true,
  fiberG: true,
} as const;

const foodSelectMinimal = {
  id: true,
  name: true,
  brand: true,
  calories: true,
  proteinG: true,
  carbsG: true,
  fatG: true,
  servingG: true,
  fiberG: true,
} as const;

export function resolveTargets(profile: Profile | null, context?: CaloriePlanContext) {
  const t = nutritionTargetsFromProfile(profile, context);
  return {
    calories: t.calories,
    proteinG: t.proteinG,
    carbsG: t.carbsG,
    fatG: t.fatG,
    waterTargetMl: t.waterTargetMl,
    nutritionGoal: t.nutritionGoal,
  };
}

export function mealTotalsFromItems(
  items: {
    quantityG: number;
    foodItem: {
      calories: number;
      proteinG: number;
      carbsG: number;
      fatG: number;
      servingG: number;
      fiberG?: number | null;
    };
  }[]
): MacroTotals & { fiberG: number } {
  const macros = roundMacros(
    sumMacros(items.map((i) => macrosForQuantity(i.foodItem, i.quantityG)))
  );
  const fiberG = Math.round(
    items.reduce((s, i) => {
      const f = i.foodItem.fiberG;
      if (f == null) return s;
      return s + f * (i.quantityG / (i.foodItem.servingG || 100));
    }, 0) * 10
  ) / 10;
  return { ...macros, fiberG };
}

export async function getOrCreateMeal(userId: string, date: Date, mealType: MealType) {
  const day = startOfDay(date);
  return prisma.meal.upsert({
    where: { userId_date_mealType: { userId, date: day, mealType } },
    create: { userId, date: day, mealType, name: MEAL_TYPE_LABELS[mealType] },
    update: {},
    include: { items: { include: { foodItem: { select: foodSelectFull } } } },
  });
}

export async function recordFoodRecent(userId: string, foodItemId: string) {
  await safePrisma(
    () =>
      prisma.foodRecent.upsert({
        where: { userId_foodItemId: { userId, foodItemId } },
        create: { userId, foodItemId, useCount: 1 },
        update: { useCount: { increment: 1 }, lastUsedAt: new Date() },
      }),
    undefined,
    { logLabel: "recordFoodRecent" }
  );
}

export async function loadNutritionDashboard(
  userId: string,
  date: Date
): Promise<NutritionDashboardPayload> {
  const day = startOfDay(date);
  let profile: Profile | null = null;
  let calorieContext: CaloriePlanContext = {};
  try {
    [profile, calorieContext] = await Promise.all([
      prisma.profile.findUnique({ where: { userId } }),
      loadCaloriePlanContext(userId),
    ]);
  } catch (e) {
    console.error("[nutrition-dashboard] profile", e);
  }

  const profileComplete = Boolean(
    profile?.weightKg &&
      profile.heightCm &&
      profile.age &&
      profile.gender &&
      profile.activityLevel
  );

  try {
    const targets = resolveTargets(profile, calorieContext);
    const foodSelect = foodSelectFull;

    const loadMeals = async () => {
      try {
        return await prisma.meal.findMany({
          where: { userId, date: day },
          include: { items: { include: { foodItem: { select: foodSelect } } } },
          orderBy: { mealType: "asc" },
        });
      } catch (e) {
        if (!isSchemaMismatchError(e)) throw e;
        return prisma.meal.findMany({
          where: { userId, date: day },
          include: { items: { include: { foodItem: { select: foodSelectMinimal } } } },
          orderBy: { mealType: "asc" },
        });
      }
    };

    const [meals, waterLogs, favorites, recents] = await Promise.all([
      loadMeals(),
      safePrisma(
        () => prisma.waterLog.findMany({ where: { userId, date: day } }),
        [] as { amountMl: number }[],
        { logLabel: "waterLog" }
      ),
      safePrisma(
        () =>
          prisma.foodFavorite.findMany({
            where: { userId },
            include: { foodItem: { select: foodSelectMinimal } },
            orderBy: [{ pinned: "desc" }, { createdAt: "desc" }],
            take: 20,
          }),
        [],
        { logLabel: "foodFavorite" }
      ),
      safePrisma(
        () =>
          prisma.foodRecent.findMany({
            where: { userId },
            include: { foodItem: { select: foodSelectMinimal } },
            orderBy: { lastUsedAt: "desc" },
            take: 15,
          }),
        [],
        { logLabel: "foodRecent" }
      ),
    ]);

    const consumedMacros = roundMacros(
      sumMacros(
        meals.flatMap((m) =>
          m.items
            .filter((i) => i.foodItem)
            .map((i) => macrosForQuantity(i.foodItem, i.quantityG))
        )
      )
    );
    const fiberG = Math.round(
      meals
        .flatMap((m) => m.items.filter((i) => i.foodItem))
        .reduce((s, i) => {
          const f = i.foodItem.fiberG;
          if (f == null) return s;
          return s + f * (i.quantityG / (i.foodItem.servingG || 100));
        }, 0) * 10
    ) / 10;
    const consumed = { ...consumedMacros, fiberG };
    const fiberTargetG = Math.max(25, Math.min(50, Math.round(targets.calories / 1000) * 14));

    const waterMl = waterLogs.reduce((s, w) => s + w.amountMl, 0);

    const mealsByType = TRACK_MEAL_ORDER.map(
      (type) => {
        const meal = meals.find((m) => m.mealType === type);
        const validItems = (meal?.items ?? []).filter((i) => i.foodItem);
        const totals = meal
          ? mealTotalsFromItems(validItems)
          : { calories: 0, proteinG: 0, carbsG: 0, fatG: 0, fiberG: 0 };
        return {
          mealType: type,
          mealId: meal?.id ?? null,
          totals,
          items: validItems.map((i) => {
            const m = macrosForQuantity(i.foodItem, i.quantityG);
            return {
              id: i.id,
              quantityG: i.quantityG,
              food: i.foodItem,
              ...m,
            };
          }),
        };
      }
    );

    return {
      date: format(day, "yyyy-MM-dd"),
      targets: {
        ...targets,
        fiberG: fiberTargetG,
        nutritionGoal: profile?.nutritionGoal ?? null,
      },
      consumed,
      remaining: {
        calories: Math.max(0, targets.calories - consumed.calories),
        proteinG: Math.max(0, targets.proteinG - consumed.proteinG),
        carbsG: Math.max(0, targets.carbsG - consumed.carbsG),
        fatG: Math.max(0, targets.fatG - consumed.fatG),
      },
      water: { consumedMl: waterMl, targetMl: targets.waterTargetMl },
      mealsByType,
      favorites: favorites.map((f) => f.foodItem),
      recents: recents.map((r) => ({ ...r.foodItem, useCount: r.useCount })),
      profileComplete,
      empty: consumed.calories === 0 && meals.every((m) => m.items.length === 0),
    };
  } catch (e) {
    console.error("[nutrition-dashboard] load failed", e);
    try {
      const meals = await prisma.meal.findMany({
        where: { userId, date: day },
        include: { items: { include: { foodItem: { select: foodSelectMinimal } } } },
      });
      const empty = createEmptyNutritionDashboard(day, profileComplete);
      const targets = resolveTargets(profile, calorieContext);
      const consumedMacros = roundMacros(
        sumMacros(
          meals.flatMap((m) =>
            m.items
              .filter((i) => i.foodItem)
              .map((i) => macrosForQuantity(i.foodItem, i.quantityG))
          )
        )
      );
      const fiberTargetG = Math.max(25, Math.min(50, Math.round(targets.calories / 1000) * 14));
      const consumed = { ...consumedMacros, fiberG: 0 };
      return {
        ...empty,
        targets: { ...empty.targets, ...targets, fiberG: fiberTargetG, nutritionGoal: profile?.nutritionGoal ?? null },
        consumed,
        remaining: {
          calories: Math.max(0, targets.calories - consumed.calories),
          proteinG: Math.max(0, targets.proteinG - consumed.proteinG),
          carbsG: Math.max(0, targets.carbsG - consumed.carbsG),
          fatG: Math.max(0, targets.fatG - consumed.fatG),
        },
        mealsByType: empty.mealsByType,
        profileComplete,
        empty: consumed.calories === 0,
      };
    } catch (fallbackErr) {
      console.error("[nutrition-dashboard] fallback failed", fallbackErr);
      return createEmptyNutritionDashboard(day, profileComplete);
    }
  }
}

export async function loadWeeklyNutrition(userId: string) {
  const end = startOfDay(new Date());
  const start = subDays(end, 6);
  const meals = await prisma.meal.findMany({
    where: { userId, date: { gte: start, lte: end } },
    include: { items: { include: { foodItem: true } } },
  });

  const byDay = new Map<string, MacroTotals>();
  for (let d = 0; d < 7; d++) {
    const key = format(subDays(end, 6 - d), "yyyy-MM-dd");
    byDay.set(key, { calories: 0, proteinG: 0, carbsG: 0, fatG: 0 });
  }
  for (const meal of meals) {
    const key = format(meal.date, "yyyy-MM-dd");
    const cur = byDay.get(key) ?? { calories: 0, proteinG: 0, carbsG: 0, fatG: 0 };
    const add = mealTotalsFromItems(meal.items);
    byDay.set(key, {
      calories: cur.calories + add.calories,
      proteinG: cur.proteinG + add.proteinG,
      carbsG: cur.carbsG + add.carbsG,
      fatG: cur.fatG + add.fatG,
    });
  }

  const days = Array.from(byDay.entries()).map(([date, totals]) => ({
    date,
    label: format(new Date(date), "EEE", { locale: de }),
    ...totals,
  }));

  const activeDays = days.filter((d) => d.calories > 0);
  const n = Math.max(activeDays.length, 1);
  const sum = activeDays.reduce(
    (a, d) => ({
      calories: a.calories + d.calories,
      proteinG: a.proteinG + d.proteinG,
      carbsG: a.carbsG + d.carbsG,
      fatG: a.fatG + d.fatG,
    }),
    { calories: 0, proteinG: 0, carbsG: 0, fatG: 0 }
  );

  return {
    days,
    averages: {
      calories: Math.round(sum.calories / n),
      proteinG: Math.round(sum.proteinG / n),
      carbsG: Math.round(sum.carbsG / n),
      fatG: Math.round(sum.fatG / n),
    },
  };
}

export async function loadNutritionInsights(userId: string) {
  const end = startOfDay(new Date());
  const start = subDays(end, 27);
  const [meals, entries, profile] = await Promise.all([
    prisma.meal.findMany({
      where: { userId, date: { gte: start, lte: end } },
      include: { items: { include: { foodItem: true } } },
    }),
    prisma.progressEntry.findMany({
      where: { userId, date: { gte: start, lte: end }, weightKg: { not: null } },
      orderBy: { date: "asc" },
    }),
    prisma.profile.findUnique({ where: { userId } }),
  ]);

  const calByDay = new Map<string, number>();
  for (const meal of meals) {
    const key = format(meal.date, "yyyy-MM-dd");
    const t = mealTotalsFromItems(meal.items);
    calByDay.set(key, (calByDay.get(key) ?? 0) + t.calories);
  }

  const calorieChart = Array.from({ length: 28 }).map((_, i) => {
    const d = subDays(end, 27 - i);
    const key = format(d, "yyyy-MM-dd");
    return { label: format(d, "dd.MM"), value: calByDay.get(key) ?? 0 };
  });

  const weightChart = entries.map((e) => ({
    label: format(e.date, "dd.MM"),
    value: e.weightKg!,
    date: format(e.date, "yyyy-MM-dd"),
  }));

  const targets = resolveTargets(profile);
  return { calorieChart, weightChart, targets };
}

export async function applyNutritionGoal(
  userId: string,
  nutritionGoal: NutritionGoal
) {
  const profile = await prisma.profile.findUnique({ where: { userId } });
  if (!profile) return null;

  await prisma.profile.update({
    where: { userId },
    data: {
      nutritionGoal,
      trainingGoal: trainingGoalFromNutritionGoal(nutritionGoal),
    },
  });

  const updated = await prisma.profile.findUnique({ where: { userId } });
  if (!updated) return null;

  const synced = await syncProfileTargetsToDb(userId, updated);
  if (!synced) return null;

  return {
    nutritionGoal,
    calories: synced.calculations.calorieTarget,
    ...synced.calculations,
  };
}
