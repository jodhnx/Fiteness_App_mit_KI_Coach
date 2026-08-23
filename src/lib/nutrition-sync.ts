import { setCached, invalidateCache, getCached } from "@/lib/client-cache";
import { roundMacros, macrosForQuantity } from "@/lib/food-macros";
import type { MealType } from "@prisma/client";
import type { FoodProduct } from "@/lib/food/food-product-types";
import {
  type NutritionDashboardPayload,
  isValidDashboardPayload,
  createEmptyNutritionDashboard,
  normalizeNutritionDashboard,
} from "@/lib/nutrition-defaults";
import { nutritionDashboardToHomeMacros } from "@/lib/nutrition-to-home";
import type { HomeDataPayload } from "@/lib/home-defaults";
import { createEmptyHomeData } from "@/lib/home-defaults";
import {
  hydrateHomeSectionCaches,
  HOME_HEUTE_CACHE,
  HOME_COACH_CACHE,
  HOME_INSIGHTS_CACHE,
  HOME_WORKOUT_CACHE,
} from "@/lib/home-section-cache";
import { nutritionDayKey, isNutritionDashboardToday } from "@/lib/nutrition-day";
import { resolveNutritionDashboardForBoot } from "@/lib/nutrition-day-rollover";
import { PROGRESS_CACHE_KEY } from "@/lib/progress-cache";
import { buildHomeCoachFromNutrition } from "@/lib/nutrition-coach";

export { HOME_COACH_CACHE, HOME_INSIGHTS_CACHE, HOME_HEUTE_CACHE, HOME_WORKOUT_CACHE } from "@/lib/home-section-cache";

export const NUTRITION_DASHBOARD_CACHE_KEY = "nutrition-dashboard";
export const NUTRITION_SUMMARY_CACHE_KEY = "nutrition-summary";
export const HOME_DATA_CACHE_KEY = "home-data";
export const PROFILE_CACHE_KEY = "profile-data";

export const NUTRITION_DASHBOARD_EVENT = "nutrition-dashboard-updated";
export const HOME_DATA_EVENT = "home-data-updated";

export type NutritionSummaryPayload = {
  nutrition: NutritionDashboardPayload;
};

export function invalidateAllNutritionCaches() {
  invalidateCache(NUTRITION_DASHBOARD_CACHE_KEY);
  invalidateCache(NUTRITION_SUMMARY_CACHE_KEY);
  invalidateCache(HOME_DATA_CACHE_KEY);
  invalidateCache(HOME_HEUTE_CACHE);
  invalidateCache(HOME_COACH_CACHE);
  invalidateCache(HOME_INSIGHTS_CACHE);
  invalidateCache(HOME_WORKOUT_CACHE);
  invalidateCache("nutrition-coach");
  invalidateCache(PROGRESS_CACHE_KEY);
}

/** Day rollover: keep targets, reset today's intake — never wipe disk cache. */
export function ensureNutritionCacheIsToday(): NutritionDashboardPayload | null {
  const cached = getCached<NutritionDashboardPayload>(NUTRITION_DASHBOARD_CACHE_KEY, {
    allowStale: true,
  });
  if (!cached || !isValidDashboardPayload(cached)) return null;
  if (isNutritionDashboardToday(cached.date)) {
    return normalizeNutritionDashboard(cached);
  }

  const rolled = resolveNutritionDashboardForBoot(cached);
  if (!rolled) return null;

  setCached(NUTRITION_DASHBOARD_CACHE_KEY, rolled, 7 * 24 * 60 * 60_000);
  const prevHome = getCached<HomeDataPayload>(HOME_DATA_CACHE_KEY, { allowStale: true });
  if (prevHome) {
    const macroSlice = nutritionDashboardToHomeMacros(rolled);
    setCached(
      HOME_DATA_CACHE_KEY,
      {
        ...prevHome,
        ...macroSlice,
        nutrition: rolled,
      },
      7 * 24 * 60 * 60_000
    );
  }
  return rolled;
}

function patchProgressNutritionToday(nutrition: NutritionDashboardPayload) {
  const progress = getCached<{
    dashboard?: { nutritionTrend?: { date: string; label: string; calories: number; proteinG: number }[] };
  }>(PROGRESS_CACHE_KEY);
  if (!progress?.dashboard?.nutritionTrend) return;

  const today = nutrition.date;
  const label = today.slice(8, 10) + "." + today.slice(5, 7);
  const point = {
    date: today,
    label,
    calories: Math.round(nutrition.consumed.calories),
    proteinG: Math.round(nutrition.consumed.proteinG),
  };
  const trend = [...progress.dashboard.nutritionTrend];
  const idx = trend.findIndex((p) => p.date === today);
  if (idx >= 0) trend[idx] = point;
  else trend.push(point);

  setCached(
    PROGRESS_CACHE_KEY,
    {
      ...progress,
      dashboard: {
        ...progress.dashboard,
        calorieTarget: nutrition.targets.calories,
        proteinTargetG: nutrition.targets.proteinG,
        nutritionTrend: trend.sort((a, b) => a.date.localeCompare(b.date)),
      },
    },
    120_000
  );
}

/** Push fresh dashboard to all client caches + notify mounted pages */
export function publishNutritionDashboard(dashboard: NutritionDashboardPayload) {
  const nutrition = normalizeNutritionDashboard(
    isValidDashboardPayload(dashboard) ? dashboard : createEmptyNutritionDashboard()
  );

  if (!isNutritionDashboardToday(nutrition.date)) {
    return;
  }

  const summary: NutritionSummaryPayload = { nutrition };
  const ttl = 7 * 24 * 60 * 60_000;

  setCached(NUTRITION_DASHBOARD_CACHE_KEY, nutrition, ttl);
  setCached(NUTRITION_SUMMARY_CACHE_KEY, summary, ttl);

  const prevHome = getCached<HomeDataPayload>(HOME_DATA_CACHE_KEY);
  const macroSlice = nutritionDashboardToHomeMacros(nutrition);
  const coach = buildHomeCoachFromNutrition(nutrition);
  const nextHome: HomeDataPayload = {
    ...(prevHome ?? createEmptyHomeData()),
    ...macroSlice,
    nutrition,
    coach,
  };

  setCached(HOME_DATA_CACHE_KEY, nextHome, ttl);
  hydrateHomeSectionCaches(nextHome);
  setCached(HOME_COACH_CACHE, coach, ttl);
  patchProgressNutritionToday(nutrition);

  if (typeof window !== "undefined") {
    window.dispatchEvent(
      new CustomEvent(NUTRITION_DASHBOARD_EVENT, { detail: nutrition })
    );
    window.dispatchEvent(new CustomEvent(HOME_DATA_EVENT, { detail: nextHome }));
  }
}

export function buildSummaryFromDashboard(
  dashboard: NutritionDashboardPayload
): NutritionSummaryPayload {
  return {
    nutrition: isValidDashboardPayload(dashboard)
      ? dashboard
      : createEmptyNutritionDashboard(),
  };
}

/** Optimistic UI while quick-add is in flight */
export function optimisticAddMealItem(
  dashboard: NutritionDashboardPayload,
  food: Pick<
    FoodProduct,
    "name" | "calories" | "proteinG" | "carbsG" | "fatG" | "fiberG" | "servingG"
  >,
  quantityG: number,
  mealType: MealType
): NutritionDashboardPayload | null {
  if (quantityG <= 0) return null;

  const macros = macrosForQuantity(
    {
      calories: food.calories,
      proteinG: food.proteinG,
      carbsG: food.carbsG,
      fatG: food.fatG,
      servingG: food.servingG || 100,
    },
    quantityG
  );
  const fiberG =
    food.fiberG != null
      ? Math.round(food.fiberG * (quantityG / 100) * 10) / 10
      : 0;

  const tempId = `opt-${Date.now()}`;
  const newItem = {
    id: tempId,
    quantityG,
    food: { name: food.name },
    calories: macros.calories,
    proteinG: macros.proteinG,
    carbsG: macros.carbsG,
    fatG: macros.fatG,
  };

  let mealId: string | null = null;
  const mealsByType = dashboard.mealsByType.map((slot) => {
    if (slot.mealType !== mealType) return slot;
    mealId = slot.mealId ?? `opt-meal-${mealType}`;
    const items = [...slot.items, newItem];
    const totals = {
      calories: slot.totals.calories + macros.calories,
      proteinG: slot.totals.proteinG + macros.proteinG,
      carbsG: slot.totals.carbsG + macros.carbsG,
      fatG: slot.totals.fatG + macros.fatG,
    };
    return { ...slot, mealId, items, totals };
  });

  const consumed = roundMacros({
    calories: dashboard.consumed.calories + macros.calories,
    proteinG: dashboard.consumed.proteinG + macros.proteinG,
    carbsG: dashboard.consumed.carbsG + macros.carbsG,
    fatG: dashboard.consumed.fatG + macros.fatG,
  });

  return {
    ...dashboard,
    date: nutritionDayKey(),
    consumed: {
      ...dashboard.consumed,
      ...consumed,
      fiberG: (dashboard.consumed.fiberG ?? 0) + fiberG,
    },
    remaining: {
      calories: Math.max(0, dashboard.targets.calories - consumed.calories),
      proteinG: Math.max(0, dashboard.targets.proteinG - consumed.proteinG),
      carbsG: Math.max(0, dashboard.targets.carbsG - consumed.carbsG),
      fatG: Math.max(0, dashboard.targets.fatG - consumed.fatG),
    },
    mealsByType,
  };
}

/** Optimistic UI while DELETE/PATCH is in flight */
export function optimisticRemoveMealItem(
  dashboard: NutritionDashboardPayload,
  itemId: string
): NutritionDashboardPayload | null {
  type RemovedMacros = { calories: number; proteinG: number; carbsG: number; fatG: number };
  let removed: RemovedMacros | undefined;
  let found = false;

  const mealsByType = dashboard.mealsByType.map((slot) => {
    const item = slot.items.find((i) => i.id === itemId);
    if (!item) return slot;
    found = true;
    removed = {
      calories: item.calories,
      proteinG: item.proteinG,
      carbsG: item.carbsG ?? 0,
      fatG: item.fatG ?? 0,
    };
    const items = slot.items.filter((i) => i.id !== itemId);
    const totals = {
      calories: Math.max(0, slot.totals.calories - item.calories),
      proteinG: Math.max(0, slot.totals.proteinG - item.proteinG),
      carbsG: Math.max(0, slot.totals.carbsG - (item.carbsG ?? 0)),
      fatG: Math.max(0, slot.totals.fatG - (item.fatG ?? 0)),
    };
    return { ...slot, items, totals };
  });

  if (!found || !removed) return null;

  const consumed = roundMacros({
    calories: Math.max(0, dashboard.consumed.calories - removed.calories),
    proteinG: Math.max(0, dashboard.consumed.proteinG - removed.proteinG),
    carbsG: Math.max(0, dashboard.consumed.carbsG - removed.carbsG),
    fatG: Math.max(0, dashboard.consumed.fatG - removed.fatG),
  });

  return {
    ...dashboard,
    date: nutritionDayKey(),
    consumed: { ...dashboard.consumed, ...consumed },
    remaining: {
      calories: Math.max(0, dashboard.targets.calories - consumed.calories),
      proteinG: Math.max(0, dashboard.targets.proteinG - consumed.proteinG),
      carbsG: Math.max(0, dashboard.targets.carbsG - consumed.carbsG),
      fatG: Math.max(0, dashboard.targets.fatG - consumed.fatG),
    },
    mealsByType,
  };
}

/** Optimistic UI while water POST is in flight */
export function optimisticAddWater(
  dashboard: NutritionDashboardPayload,
  amountMl: number
): NutritionDashboardPayload | null {
  if (amountMl <= 0) return null;
  const consumedMl = dashboard.water.consumedMl + amountMl;
  return {
    ...dashboard,
    date: nutritionDayKey(),
    water: { ...dashboard.water, consumedMl },
  };
}

/** Optimistic UI while PATCH quantity is in flight */
export function optimisticPatchItemQuantity(
  dashboard: NutritionDashboardPayload,
  itemId: string,
  quantityG: number
): NutritionDashboardPayload | null {
  if (quantityG <= 0) return null;

  let targetItem: (typeof dashboard.mealsByType)[0]["items"][0] | null = null;
  for (const slot of dashboard.mealsByType) {
    const item = slot.items.find((i) => i.id === itemId);
    if (item) {
      targetItem = item;
      break;
    }
  }
  if (!targetItem) return null;

  const ratio = quantityG / targetItem.quantityG;
  const delta = {
    calories: Math.round(targetItem.calories * ratio) - targetItem.calories,
    proteinG: Math.round(targetItem.proteinG * ratio * 10) / 10 - targetItem.proteinG,
    carbsG: Math.round((targetItem.carbsG ?? 0) * ratio * 10) / 10 - (targetItem.carbsG ?? 0),
    fatG: Math.round((targetItem.fatG ?? 0) * ratio * 10) / 10 - (targetItem.fatG ?? 0),
  };

  const mealsByType = dashboard.mealsByType.map((slot) => {
    const item = slot.items.find((i) => i.id === itemId);
    if (!item) return slot;
    const newItem = {
      ...item,
      quantityG,
      calories: Math.round(item.calories * ratio),
      proteinG: Math.round(item.proteinG * ratio * 10) / 10,
      carbsG: Math.round((item.carbsG ?? 0) * ratio * 10) / 10,
      fatG: Math.round((item.fatG ?? 0) * ratio * 10) / 10,
    };
    const items = slot.items.map((i) => (i.id === itemId ? newItem : i));
    const totals = {
      calories: Math.max(0, slot.totals.calories + delta.calories),
      proteinG: Math.max(0, slot.totals.proteinG + delta.proteinG),
      carbsG: Math.max(0, slot.totals.carbsG + delta.carbsG),
      fatG: Math.max(0, slot.totals.fatG + delta.fatG),
    };
    return { ...slot, items, totals };
  });

  const consumed = roundMacros({
    calories: Math.max(0, dashboard.consumed.calories + delta.calories),
    proteinG: Math.max(0, dashboard.consumed.proteinG + delta.proteinG),
    carbsG: Math.max(0, dashboard.consumed.carbsG + delta.carbsG),
    fatG: Math.max(0, dashboard.consumed.fatG + delta.fatG),
  });

  return {
    ...dashboard,
    date: nutritionDayKey(),
    consumed: { ...dashboard.consumed, ...consumed },
    remaining: {
      calories: Math.max(0, dashboard.targets.calories - consumed.calories),
      proteinG: Math.max(0, dashboard.targets.proteinG - consumed.proteinG),
      carbsG: Math.max(0, dashboard.targets.carbsG - consumed.carbsG),
      fatG: Math.max(0, dashboard.targets.fatG - consumed.fatG),
    },
    mealsByType,
  };
}

/** Optimistic UI while DELETE meal is in flight */
export function optimisticRemoveMeal(
  dashboard: NutritionDashboardPayload,
  mealId: string
): NutritionDashboardPayload | null {
  type RemovedMacros = { calories: number; proteinG: number; carbsG: number; fatG: number };
  let removed: RemovedMacros | undefined;
  let found = false;

  const mealsByType = dashboard.mealsByType.map((slot) => {
    if (slot.mealId !== mealId) return slot;
    found = true;
    removed = {
      calories: slot.totals.calories,
      proteinG: slot.totals.proteinG,
      carbsG: slot.totals.carbsG,
      fatG: slot.totals.fatG,
    };
    return {
      ...slot,
      mealId: null,
      items: [],
      totals: { calories: 0, proteinG: 0, carbsG: 0, fatG: 0 },
    };
  });

  if (!found || !removed) return null;

  const consumed = roundMacros({
    calories: Math.max(0, dashboard.consumed.calories - removed.calories),
    proteinG: Math.max(0, dashboard.consumed.proteinG - removed.proteinG),
    carbsG: Math.max(0, dashboard.consumed.carbsG - removed.carbsG),
    fatG: Math.max(0, dashboard.consumed.fatG - removed.fatG),
  });

  return {
    ...dashboard,
    date: nutritionDayKey(),
    consumed: { ...dashboard.consumed, ...consumed },
    remaining: {
      calories: Math.max(0, dashboard.targets.calories - consumed.calories),
      proteinG: Math.max(0, dashboard.targets.proteinG - consumed.proteinG),
      carbsG: Math.max(0, dashboard.targets.carbsG - consumed.carbsG),
      fatG: Math.max(0, dashboard.targets.fatG - consumed.fatG),
    },
    mealsByType,
  };
}

/** Patch persisted home streak after a meal is logged (once per day server-side). */
export function patchHomeNutritionStreak(days: number) {
  if (typeof window === "undefined") return;
  const prevHome = getCached<HomeDataPayload>(HOME_DATA_CACHE_KEY, { allowStale: true });
  if (!prevHome) return;
  const next: HomeDataPayload = {
    ...prevHome,
    nutritionStreak: {
      currentDays: days,
      longestDays: Math.max(prevHome.nutritionStreak?.longestDays ?? 0, days),
    },
  };
  setCached(HOME_DATA_CACHE_KEY, next, 7 * 24 * 60 * 60_000);
  window.dispatchEvent(new CustomEvent(HOME_DATA_EVENT, { detail: next }));
}

/** After quick-add / delete — instant sync without refetch */
export async function applyNutritionMutationResponse(
  res: Response
): Promise<NutritionDashboardPayload | null> {
  try {
    const body = await res.json();
    if (body?.dashboard && isValidDashboardPayload(body.dashboard)) {
      publishNutritionDashboard(body.dashboard);
      if (typeof body.nutritionStreak === "number") {
        patchHomeNutritionStreak(body.nutritionStreak);
      }
      return body.dashboard;
    }
  } catch {
    /* ignore */
  }
  return null;
}
