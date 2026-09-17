/**
 * Nutrition meal plans — planned foods only (never auto-logged as eaten).
 */

import type { MealType, NutritionPlanStatus, Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { nutritionTargetsFromProfile } from "@/lib/calorie-target";
import { macrosForQuantity, roundMacros, sumMacros, type MacroTotals } from "@/lib/food-macros";
import { accessibleFoodItemFilter } from "@/lib/food/food-access";
import { MEAL_TYPE_LABELS } from "@/lib/meal-types";
import type {
  PlanDayDto,
  PlanDetailDto,
  PlanItemDto,
  PlanListItemDto,
  PlanMealDto,
} from "@/lib/nutrition-plan-types";

export type {
  PlanDayDto,
  PlanDetailDto,
  PlanItemDto,
  PlanListItemDto,
  PlanMealDto,
} from "@/lib/nutrition-plan-types";

const planInclude = {
  days: {
    orderBy: { dayNumber: "asc" as const },
    include: {
      meals: {
        orderBy: { sortOrder: "asc" as const },
        include: {
          items: { orderBy: { sortOrder: "asc" as const } },
        },
      },
    },
  },
} satisfies Prisma.NutritionPlanInclude;

export type PlanWithTree = Prisma.NutritionPlanGetPayload<{
  include: typeof planInclude;
}>;

function itemToDto(
  item: PlanWithTree["days"][0]["meals"][0]["items"][0]
): PlanItemDto {
  return {
    id: item.id,
    mealId: item.mealId,
    foodItemId: item.foodItemId,
    recipeId: item.recipeId,
    nameSnapshot: item.nameSnapshot,
    brandSnapshot: item.brandSnapshot,
    quantityG: item.quantityG,
    unit: item.unit,
    calories: item.calories,
    proteinG: item.proteinG,
    carbsG: item.carbsG,
    fatG: item.fatG,
    fiberG: item.fiberG,
    sortOrder: item.sortOrder,
  };
}

function mealTotals(
  items: PlanWithTree["days"][0]["meals"][0]["items"]
): MacroTotals {
  return sumMacros(
    items.map((i) => ({
      calories: i.calories,
      proteinG: i.proteinG,
      carbsG: i.carbsG,
      fatG: i.fatG,
    }))
  );
}

export function serializePlanDetail(plan: PlanWithTree): PlanDetailDto {
  const days: PlanDayDto[] = plan.days.map((day) => {
    const meals: PlanMealDto[] = day.meals.map((meal) => ({
      id: meal.id,
      dayId: meal.dayId,
      mealType: meal.mealType,
      title: meal.title,
      sortOrder: meal.sortOrder,
      items: meal.items.map(itemToDto),
      totals: mealTotals(meal.items),
    }));
    const totals = sumMacros(meals.map((m) => m.totals));
    return {
      id: day.id,
      dayNumber: day.dayNumber,
      date: day.date ? day.date.toISOString().slice(0, 10) : null,
      meals,
      totals,
      mealCount: meals.length,
      itemCount: meals.reduce((n, m) => n + m.items.length, 0),
    };
  });

  const weekAverage =
    days.length > 0
      ? roundMacros({
          calories:
            days.reduce((s, d) => s + d.totals.calories, 0) / days.length,
          proteinG:
            days.reduce((s, d) => s + d.totals.proteinG, 0) / days.length,
          carbsG: days.reduce((s, d) => s + d.totals.carbsG, 0) / days.length,
          fatG: days.reduce((s, d) => s + d.totals.fatG, 0) / days.length,
        })
      : { calories: 0, proteinG: 0, carbsG: 0, fatG: 0 };

  return {
    id: plan.id,
    name: plan.name,
    description: plan.description,
    durationDays: plan.durationDays,
    startDate: plan.startDate
      ? plan.startDate.toISOString().slice(0, 10)
      : null,
    status: plan.status,
    isActive: plan.isActive,
    targetCalories: plan.targetCalories ?? 0,
    targetProteinG: plan.targetProteinG ?? 0,
    targetCarbsG: plan.targetCarbsG ?? 0,
    targetFatG: plan.targetFatG ?? 0,
    createdAt: plan.createdAt.toISOString(),
    updatedAt: plan.updatedAt.toISOString(),
    days,
    weekAverage,
    totalMeals: days.reduce((n, d) => n + d.mealCount, 0),
    totalItems: days.reduce((n, d) => n + d.itemCount, 0),
  };
}

async function resolveUserTargets(userId: string) {
  const profile = await prisma.profile.findUnique({ where: { userId } });
  const targets = nutritionTargetsFromProfile(profile);
  return {
    targetCalories: targets.calories > 0 ? Math.round(targets.calories) : null,
    targetProteinG: targets.proteinG > 0 ? Math.round(targets.proteinG) : null,
    targetCarbsG: targets.carbsG > 0 ? Math.round(targets.carbsG) : null,
    targetFatG: targets.fatG > 0 ? Math.round(targets.fatG) : null,
  };
}

export async function listNutritionPlans(
  userId: string
): Promise<PlanListItemDto[]> {
  const plans = await prisma.nutritionPlan.findMany({
    where: { userId },
    orderBy: [{ isActive: "desc" }, { updatedAt: "desc" }],
    include: {
      days: {
        include: {
          meals: { include: { _count: { select: { items: true } } } },
        },
      },
    },
  });

  return plans.map((p) => {
    const mealCount = p.days.reduce((n, d) => n + d.meals.length, 0);
    const itemCount = p.days.reduce(
      (n, d) => n + d.meals.reduce((m, meal) => m + meal._count.items, 0),
      0
    );
    const progressDays = p.days.filter((d) =>
      d.meals.some((m) => m._count.items > 0)
    ).length;
    return {
      id: p.id,
      name: p.name,
      durationDays: p.durationDays,
      status: p.status,
      isActive: p.isActive,
      targetCalories: p.targetCalories ?? 0,
      targetProteinG: p.targetProteinG ?? 0,
      targetCarbsG: p.targetCarbsG ?? 0,
      targetFatG: p.targetFatG ?? 0,
      mealCount,
      itemCount,
      progressDays,
      createdAt: p.createdAt.toISOString(),
      updatedAt: p.updatedAt.toISOString(),
    };
  });
}

export async function getOwnedPlan(
  userId: string,
  planId: string
): Promise<PlanWithTree | null> {
  return prisma.nutritionPlan.findFirst({
    where: { id: planId, userId },
    include: planInclude,
  });
}

export async function createNutritionPlan(
  userId: string,
  input: {
    name: string;
    durationDays: number;
    startDate?: string | null;
    description?: string | null;
  }
): Promise<PlanDetailDto> {
  const targets = await resolveUserTargets(userId);
  const startDate = input.startDate
    ? new Date(`${input.startDate}T12:00:00.000Z`)
    : null;

  const plan = await prisma.nutritionPlan.create({
    data: {
      userId,
      name: input.name.trim(),
      description: input.description?.trim() || null,
      durationDays: input.durationDays,
      startDate: startDate && !Number.isNaN(startDate.getTime()) ? startDate : null,
      status: "DRAFT",
      isActive: false,
      ...targets,
      days: {
        create: Array.from({ length: input.durationDays }, (_, i) => {
          const dayNumber = i + 1;
          let date: Date | null = null;
          if (startDate && !Number.isNaN(startDate.getTime())) {
            date = new Date(startDate);
            date.setUTCDate(date.getUTCDate() + i);
          }
          return {
            dayNumber,
            date,
            meals: {
              create: [
                {
                  mealType: "BREAKFAST" as MealType,
                  title: MEAL_TYPE_LABELS.BREAKFAST,
                  sortOrder: 0,
                },
                {
                  mealType: "LUNCH" as MealType,
                  title: MEAL_TYPE_LABELS.LUNCH,
                  sortOrder: 1,
                },
                {
                  mealType: "DINNER" as MealType,
                  title: MEAL_TYPE_LABELS.DINNER,
                  sortOrder: 2,
                },
              ],
            },
          };
        }),
      },
    },
    include: planInclude,
  });

  return serializePlanDetail(plan);
}

export async function updateNutritionPlanMeta(
  userId: string,
  planId: string,
  patch: {
    name?: string;
    description?: string | null;
    status?: NutritionPlanStatus;
    isActive?: boolean;
    startDate?: string | null;
  }
): Promise<PlanDetailDto | null> {
  const existing = await prisma.nutritionPlan.findFirst({
    where: { id: planId, userId },
  });
  if (!existing) return null;

  if (patch.isActive === true) {
    await prisma.nutritionPlan.updateMany({
      where: { userId, isActive: true, NOT: { id: planId } },
      data: { isActive: false, status: "DRAFT" },
    });
  }

  const startDate =
    patch.startDate === undefined
      ? undefined
      : patch.startDate
        ? new Date(`${patch.startDate}T12:00:00.000Z`)
        : null;

  await prisma.nutritionPlan.update({
    where: { id: planId },
    data: {
      ...(patch.name != null ? { name: patch.name.trim() } : {}),
      ...(patch.description !== undefined
        ? { description: patch.description?.trim() || null }
        : {}),
      ...(patch.status != null
        ? {
            status: patch.status,
            isActive: patch.status === "ACTIVE" ? true : patch.isActive,
          }
        : {}),
      ...(patch.isActive !== undefined
        ? {
            isActive: patch.isActive,
            status: patch.isActive ? "ACTIVE" : existing.status === "ACTIVE" ? "DRAFT" : existing.status,
          }
        : {}),
      ...(startDate !== undefined
        ? {
            startDate:
              startDate && !Number.isNaN(startDate.getTime()) ? startDate : null,
          }
        : {}),
    },
  });

  const full = await getOwnedPlan(userId, planId);
  return full ? serializePlanDetail(full) : null;
}

export async function deleteNutritionPlan(userId: string, planId: string) {
  const res = await prisma.nutritionPlan.deleteMany({
    where: { id: planId, userId },
  });
  return res.count > 0;
}

export async function duplicateNutritionPlan(userId: string, planId: string) {
  const source = await getOwnedPlan(userId, planId);
  if (!source) return null;

  const plan = await prisma.nutritionPlan.create({
    data: {
      userId,
      name: `${source.name} (Kopie)`,
      description: source.description,
      durationDays: source.durationDays,
      startDate: null,
      status: "DRAFT",
      isActive: false,
      targetCalories: source.targetCalories,
      targetProteinG: source.targetProteinG,
      targetCarbsG: source.targetCarbsG,
      targetFatG: source.targetFatG,
      days: {
        create: source.days.map((day) => ({
          dayNumber: day.dayNumber,
          date: null,
          meals: {
            create: day.meals.map((meal) => ({
              mealType: meal.mealType,
              title: meal.title,
              sortOrder: meal.sortOrder,
              items: {
                create: meal.items.map((item) => ({
                  foodItemId: item.foodItemId,
                  recipeId: item.recipeId,
                  nameSnapshot: item.nameSnapshot,
                  brandSnapshot: item.brandSnapshot,
                  quantityG: item.quantityG,
                  unit: item.unit,
                  calories: item.calories,
                  proteinG: item.proteinG,
                  carbsG: item.carbsG,
                  fatG: item.fatG,
                  fiberG: item.fiberG,
                  sortOrder: item.sortOrder,
                })),
              },
            })),
          },
        })),
      },
    },
    include: planInclude,
  });

  return serializePlanDetail(plan);
}

async function assertOwnedMeal(userId: string, mealId: string) {
  return prisma.nutritionPlanMeal.findFirst({
    where: { id: mealId, day: { plan: { userId } } },
    include: { day: { select: { id: true, planId: true } } },
  });
}

async function assertOwnedDay(userId: string, dayId: string) {
  return prisma.nutritionPlanDay.findFirst({
    where: { id: dayId, plan: { userId } },
  });
}

async function assertOwnedItem(userId: string, itemId: string) {
  return prisma.nutritionPlanItem.findFirst({
    where: { id: itemId, meal: { day: { plan: { userId } } } },
    include: {
      meal: { select: { id: true, dayId: true } },
    },
  });
}

export async function addMealToDay(
  userId: string,
  dayId: string,
  mealType: MealType,
  title?: string | null
) {
  const day = await assertOwnedDay(userId, dayId);
  if (!day) return { error: "Tag nicht gefunden" as const };

  const maxSort = await prisma.nutritionPlanMeal.aggregate({
    where: { dayId },
    _max: { sortOrder: true },
  });

  await prisma.nutritionPlanMeal.create({
    data: {
      dayId,
      mealType,
      title: title?.trim() || MEAL_TYPE_LABELS[mealType],
      sortOrder: (maxSort._max.sortOrder ?? -1) + 1,
    },
  });

  const plan = await getOwnedPlan(userId, day.planId);
  return plan ? { plan: serializePlanDetail(plan) } : { error: "Plan nicht gefunden" as const };
}

export async function deletePlanMeal(userId: string, mealId: string) {
  const meal = await assertOwnedMeal(userId, mealId);
  if (!meal) return { error: "Mahlzeit nicht gefunden" as const };
  await prisma.nutritionPlanMeal.delete({ where: { id: mealId } });
  const plan = await getOwnedPlan(userId, meal.day.planId);
  return plan ? { plan: serializePlanDetail(plan) } : { error: "Plan nicht gefunden" as const };
}

export async function addItemToMeal(
  userId: string,
  mealId: string,
  input: {
    foodItemId?: string | null;
    recipeId?: string | null;
    nameSnapshot: string;
    brandSnapshot?: string | null;
    quantityG: number;
    unit?: string;
    calories: number;
    proteinG: number;
    carbsG: number;
    fatG: number;
    fiberG?: number | null;
  }
) {
  const meal = await assertOwnedMeal(userId, mealId);
  if (!meal) return { error: "Mahlzeit nicht gefunden" as const };

  if (input.foodItemId) {
    const food = await prisma.foodItem.findFirst({
      where: {
        id: input.foodItemId,
        ...accessibleFoodItemFilter(userId),
      },
      select: { id: true },
    });
    if (!food) return { error: "Lebensmittel nicht gefunden" as const };
  }

  const macros = roundMacros({
    calories: input.calories,
    proteinG: input.proteinG,
    carbsG: input.carbsG,
    fatG: input.fatG,
  });

  const maxSort = await prisma.nutritionPlanItem.aggregate({
    where: { mealId },
    _max: { sortOrder: true },
  });

  await prisma.nutritionPlanItem.create({
    data: {
      mealId,
      foodItemId: input.foodItemId ?? null,
      recipeId: input.recipeId ?? null,
      nameSnapshot: input.nameSnapshot.trim(),
      brandSnapshot: input.brandSnapshot ?? null,
      quantityG: input.quantityG,
      unit: input.unit ?? "g",
      calories: macros.calories,
      proteinG: macros.proteinG,
      carbsG: macros.carbsG,
      fatG: macros.fatG,
      fiberG: input.fiberG ?? null,
      sortOrder: (maxSort._max.sortOrder ?? -1) + 1,
    },
  });

  const plan = await getOwnedPlan(userId, meal.day.planId);
  return plan ? { plan: serializePlanDetail(plan) } : { error: "Plan nicht gefunden" as const };
}

export async function addFoodProductToMeal(
  userId: string,
  mealId: string,
  foodItemId: string,
  quantityG: number
) {
  const food = await prisma.foodItem.findFirst({
    where: { id: foodItemId, ...accessibleFoodItemFilter(userId) },
  });
  if (!food) return { error: "Lebensmittel nicht gefunden" as const };
  const macros = macrosForQuantity(
    {
      calories: food.calories,
      proteinG: food.proteinG,
      carbsG: food.carbsG,
      fatG: food.fatG,
      servingG: food.servingG,
    },
    quantityG
  );
  return addItemToMeal(userId, mealId, {
    foodItemId: food.id,
    nameSnapshot: food.name,
    brandSnapshot: food.brand,
    quantityG,
    calories: macros.calories,
    proteinG: macros.proteinG,
    carbsG: macros.carbsG,
    fatG: macros.fatG,
    fiberG: food.fiberG != null ? (food.fiberG * quantityG) / (food.servingG || 100) : null,
  });
}

/** Expand saved meal template into planned items (not diary). */
export async function addSavedMealToPlanMeal(
  userId: string,
  mealId: string,
  recipeId: string
) {
  const meal = await assertOwnedMeal(userId, mealId);
  if (!meal) return { error: "Mahlzeit nicht gefunden" as const };

  const recipe = await prisma.recipe.findFirst({
    where: { id: recipeId, userId },
    include: { ingredients: { include: { foodItem: true } } },
  });
  if (!recipe) return { error: "Gespeicherte Mahlzeit nicht gefunden" as const };

  let sort = (
    await prisma.nutritionPlanItem.aggregate({
      where: { mealId },
      _max: { sortOrder: true },
    })
  )._max.sortOrder ?? -1;

  for (const ing of recipe.ingredients) {
    const food = ing.foodItem;
    const macros = macrosForQuantity(
      {
        calories: food.calories,
        proteinG: food.proteinG,
        carbsG: food.carbsG,
        fatG: food.fatG,
        servingG: food.servingG,
      },
      ing.quantityG
    );
    sort += 1;
    await prisma.nutritionPlanItem.create({
      data: {
        mealId,
        foodItemId: food.id,
        recipeId: recipe.id,
        nameSnapshot: food.name,
        brandSnapshot: food.brand,
        quantityG: ing.quantityG,
        unit: "g",
        calories: macros.calories,
        proteinG: macros.proteinG,
        carbsG: macros.carbsG,
        fatG: macros.fatG,
        fiberG:
          food.fiberG != null
            ? (food.fiberG * ing.quantityG) / (food.servingG || 100)
            : null,
        sortOrder: sort,
      },
    });
  }

  const plan = await getOwnedPlan(userId, meal.day.planId);
  return plan ? { plan: serializePlanDetail(plan) } : { error: "Plan nicht gefunden" as const };
}

export async function patchPlanItem(
  userId: string,
  itemId: string,
  patch: { quantityG?: number; nameSnapshot?: string }
) {
  const item = await assertOwnedItem(userId, itemId);
  if (!item) return { error: "Eintrag nicht gefunden" as const };

  let data: Prisma.NutritionPlanItemUpdateInput = {};

  if (patch.quantityG != null && patch.quantityG > 0) {
    if (item.foodItemId) {
      const food = await prisma.foodItem.findFirst({
        where: {
          id: item.foodItemId,
          ...accessibleFoodItemFilter(userId),
        },
      });
      if (food) {
        const macros = macrosForQuantity(
          {
            calories: food.calories,
            proteinG: food.proteinG,
            carbsG: food.carbsG,
            fatG: food.fatG,
            servingG: food.servingG,
          },
          patch.quantityG
        );
        data = {
          quantityG: patch.quantityG,
          calories: macros.calories,
          proteinG: macros.proteinG,
          carbsG: macros.carbsG,
          fatG: macros.fatG,
          fiberG:
            food.fiberG != null
              ? (food.fiberG * patch.quantityG) / (food.servingG || 100)
              : null,
        };
      } else {
        // Scale from snapshot
        const full = await prisma.nutritionPlanItem.findUnique({
          where: { id: itemId },
        });
        if (!full) return { error: "Eintrag nicht gefunden" as const };
        const ratio = patch.quantityG / (full.quantityG || 1);
        data = {
          quantityG: patch.quantityG,
          calories: Math.round(full.calories * ratio),
          proteinG: Math.round(full.proteinG * ratio * 10) / 10,
          carbsG: Math.round(full.carbsG * ratio * 10) / 10,
          fatG: Math.round(full.fatG * ratio * 10) / 10,
        };
      }
    } else {
      const full = await prisma.nutritionPlanItem.findUnique({
        where: { id: itemId },
      });
      if (!full) return { error: "Eintrag nicht gefunden" as const };
      const ratio = patch.quantityG / (full.quantityG || 1);
      data = {
        quantityG: patch.quantityG,
        calories: Math.round(full.calories * ratio),
        proteinG: Math.round(full.proteinG * ratio * 10) / 10,
        carbsG: Math.round(full.carbsG * ratio * 10) / 10,
        fatG: Math.round(full.fatG * ratio * 10) / 10,
      };
    }
  }

  if (patch.nameSnapshot != null) {
    data.nameSnapshot = patch.nameSnapshot.trim();
  }

  await prisma.nutritionPlanItem.update({ where: { id: itemId }, data });

  const meal = await assertOwnedMeal(userId, item.meal.id);
  if (!meal) return { error: "Mahlzeit nicht gefunden" as const };
  const plan = await getOwnedPlan(userId, meal.day.planId);
  return plan ? { plan: serializePlanDetail(plan) } : { error: "Plan nicht gefunden" as const };
}

export async function deletePlanItem(userId: string, itemId: string) {
  const item = await assertOwnedItem(userId, itemId);
  if (!item) return { error: "Eintrag nicht gefunden" as const };
  await prisma.nutritionPlanItem.delete({ where: { id: itemId } });
  const meal = await assertOwnedMeal(userId, item.meal.id);
  if (!meal) return { error: "Mahlzeit nicht gefunden" as const };
  const plan = await getOwnedPlan(userId, meal.day.planId);
  return plan ? { plan: serializePlanDetail(plan) } : { error: "Plan nicht gefunden" as const };
}

export async function duplicatePlanDay(
  userId: string,
  sourceDayId: string,
  targetDayId: string
) {
  const source = await prisma.nutritionPlanDay.findFirst({
    where: { id: sourceDayId, plan: { userId } },
    include: {
      meals: { include: { items: true }, orderBy: { sortOrder: "asc" } },
    },
  });
  const target = await assertOwnedDay(userId, targetDayId);
  if (!source || !target) return { error: "Tag nicht gefunden" as const };
  if (source.planId !== target.planId) {
    return { error: "Tage gehören nicht zum selben Plan" as const };
  }

  await prisma.nutritionPlanMeal.deleteMany({ where: { dayId: targetDayId } });

  for (const meal of source.meals) {
    await prisma.nutritionPlanMeal.create({
      data: {
        dayId: targetDayId,
        mealType: meal.mealType,
        title: meal.title,
        sortOrder: meal.sortOrder,
        items: {
          create: meal.items.map((item) => ({
            foodItemId: item.foodItemId,
            recipeId: item.recipeId,
            nameSnapshot: item.nameSnapshot,
            brandSnapshot: item.brandSnapshot,
            quantityG: item.quantityG,
            unit: item.unit,
            calories: item.calories,
            proteinG: item.proteinG,
            carbsG: item.carbsG,
            fatG: item.fatG,
            fiberG: item.fiberG,
            sortOrder: item.sortOrder,
          })),
        },
      },
    });
  }

  const plan = await getOwnedPlan(userId, target.planId);
  return plan ? { plan: serializePlanDetail(plan) } : { error: "Plan nicht gefunden" as const };
}

export async function clearPlanDay(userId: string, dayId: string) {
  const day = await assertOwnedDay(userId, dayId);
  if (!day) return { error: "Tag nicht gefunden" as const };
  await prisma.nutritionPlanMeal.deleteMany({ where: { dayId } });
  const plan = await getOwnedPlan(userId, day.planId);
  return plan ? { plan: serializePlanDetail(plan) } : { error: "Plan nicht gefunden" as const };
}

/** Log a single planned item into the real diary (explicit action only). */
export async function logPlanItemAsEaten(
  userId: string,
  itemId: string,
  mealType?: MealType,
  dateYmd?: string | null
) {
  const item = await prisma.nutritionPlanItem.findFirst({
    where: { id: itemId, meal: { day: { plan: { userId } } } },
    include: {
      meal: { select: { mealType: true } },
    },
  });
  if (!item) return { error: "Eintrag nicht gefunden" as const };

  const { getOrCreateMeal, loadNutritionDashboard } = await import(
    "@/lib/nutrition-service"
  );
  const { resolveNutritionDay } = await import("@/lib/nutrition-day");
  const { updateNutritionStreak, loadNutritionStreak } = await import(
    "@/lib/nutrition-streak"
  );
  const { foodSnapshotFromConfirmed } = await import(
    "@/lib/food/confirmed-macros"
  );

  const day = resolveNutritionDay({ date: dateYmd ?? null });
  const diaryMeal = await getOrCreateMeal(
    userId,
    day.date,
    mealType ?? item.meal.mealType
  );

  let foodItemId = item.foodItemId;
  if (!foodItemId) {
    const snap = foodSnapshotFromConfirmed(
      item.nameSnapshot,
      {
        calories: item.calories,
        proteinG: item.proteinG,
        carbsG: item.carbsG,
        fatG: item.fatG,
      },
      item.quantityG,
      { brand: item.brandSnapshot }
    );
    const created = await prisma.foodItem.create({
      data: {
        slug: `plan-log-${userId}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        name: snap.name,
        brand: snap.brand,
        calories: snap.calories,
        proteinG: snap.proteinG,
        carbsG: snap.carbsG,
        fatG: snap.fatG,
        fiberG: snap.fiberG,
        servingG: snap.servingG,
        dataSource: "plan_log_snapshot",
        userId,
      },
    });
    foodItemId = created.id;
  }

  await prisma.mealItem.create({
    data: {
      mealId: diaryMeal.id,
      foodItemId,
      quantityG: item.quantityG,
    },
  });

  await updateNutritionStreak(userId, day.date);
  const streak = await loadNutritionStreak(userId);
  const dashboard = await loadNutritionDashboard(userId, day.date);
  return {
    dashboard,
    nutritionStreak: streak.effectiveDays,
    name: item.nameSnapshot,
  };
}

/** Lean active-plan card payload — only current day macros (not full plan tree). */
export async function getActivePlanSummary(userId: string) {
  const plan = await prisma.nutritionPlan.findFirst({
    where: { userId, isActive: true },
    select: {
      id: true,
      name: true,
      durationDays: true,
      startDate: true,
      targetCalories: true,
      targetProteinG: true,
    },
  });
  if (!plan) return null;

  const today = new Date();
  let currentDayNumber = 1;
  if (plan.startDate) {
    const start = new Date(plan.startDate);
    const diff = Math.floor(
      (Date.UTC(today.getFullYear(), today.getMonth(), today.getDate()) -
        Date.UTC(start.getFullYear(), start.getMonth(), start.getDate())) /
        86_400_000
    );
    currentDayNumber = Math.min(
      plan.durationDays,
      Math.max(1, diff + 1)
    );
  } else {
    const firstWithItems = await prisma.nutritionPlanDay.findFirst({
      where: {
        planId: plan.id,
        meals: { some: { items: { some: {} } } },
      },
      orderBy: { dayNumber: "asc" },
      select: { dayNumber: true },
    });
    currentDayNumber = firstWithItems?.dayNumber ?? 1;
  }

  const day = await prisma.nutritionPlanDay.findFirst({
    where: { planId: plan.id, dayNumber: currentDayNumber },
    select: {
      meals: {
        select: {
          items: {
            select: {
              calories: true,
              proteinG: true,
              carbsG: true,
              fatG: true,
            },
          },
        },
      },
    },
  });

  const totals = day
    ? sumMacros(
        day.meals.flatMap((m) =>
          m.items.map((i) => ({
            calories: i.calories,
            proteinG: i.proteinG,
            carbsG: i.carbsG,
            fatG: i.fatG,
          }))
        )
      )
    : { calories: 0, proteinG: 0, carbsG: 0, fatG: 0 };

  return {
    id: plan.id,
    name: plan.name,
    durationDays: plan.durationDays,
    currentDayNumber,
    totals,
    targetCalories: plan.targetCalories ?? 0,
    targetProteinG: plan.targetProteinG ?? 0,
  };
}
