import type { MealType, NutritionGoal } from "@prisma/client";
import { format, startOfDay } from "date-fns";
import { TRACK_MEAL_ORDER } from "@/lib/meal-types";
import { coerceToKilocalories, sanitizeCalorieTarget, sanitizeExerciseKcal } from "@/lib/daily-kcal";

export type NutritionDashboardPayload = {
  date: string;
  targets: {
    calories: number;
    proteinG: number;
    carbsG: number;
    fatG: number;
    fiberG: number;
    waterTargetMl: number;
    nutritionGoal: NutritionGoal | null;
  };
  consumed: { calories: number; proteinG: number; carbsG: number; fatG: number; fiberG: number };
  remaining: { calories: number; proteinG: number; carbsG: number; fatG: number };
  /** Today's exercise kcal added back to remaining (cardio + workouts) */
  exerciseBurned?: {
    calories: number;
    estimated: boolean;
  };
  water: { consumedMl: number; targetMl: number };
  mealsByType: {
    mealType: MealType;
    mealId: string | null;
    totals: { calories: number; proteinG: number; carbsG: number; fatG: number };
    items: {
      id: string;
      quantityG: number;
      food: { name: string; brand?: string | null };
      calories: number;
      proteinG: number;
      carbsG?: number;
      fatG?: number;
    }[];
  }[];
  favorites: {
    id: string;
    name: string;
    brand?: string | null;
    calories: number;
    proteinG: number;
    carbsG: number;
    fatG: number;
    servingG: number;
  }[];
  recents: {
    id: string;
    name: string;
    brand?: string | null;
    calories: number;
    proteinG: number;
    carbsG: number;
    fatG: number;
    servingG: number;
    useCount?: number;
  }[];
  profileComplete: boolean;
  empty?: boolean;
};

export function hasNutritionTargets(d: NutritionDashboardPayload): boolean {
  return (d.targets.calories ?? 0) > 0;
}

export function nutritionProfileIncomplete(d: NutritionDashboardPayload): boolean {
  return !d.profileComplete && d.targets.calories <= 0;
}

export function createEmptyNutritionDashboard(
  date: Date = new Date(),
  profileComplete = false
): NutritionDashboardPayload {
  const day = startOfDay(date);
  const targets = {
    calories: 0,
    proteinG: 0,
    carbsG: 0,
    fatG: 0,
    fiberG: 0,
    waterTargetMl: 2500,
    nutritionGoal: null,
  };
  const consumed = { calories: 0, proteinG: 0, carbsG: 0, fatG: 0, fiberG: 0 };
  const mealTypes = TRACK_MEAL_ORDER;

  return {
    date: format(day, "yyyy-MM-dd"),
    targets,
    consumed,
    remaining: {
      calories: targets.calories,
      proteinG: targets.proteinG,
      carbsG: targets.carbsG,
      fatG: targets.fatG,
    },
    water: { consumedMl: 0, targetMl: targets.waterTargetMl },
    exerciseBurned: { calories: 0, estimated: false },
    mealsByType: mealTypes.map((mealType) => ({
      mealType,
      mealId: null,
      totals: { calories: 0, proteinG: 0, carbsG: 0, fatG: 0 },
      items: [],
    })),
    favorites: [],
    recents: [],
    profileComplete,
    empty: true,
  };
}

export function isValidDashboardPayload(data: unknown): data is NutritionDashboardPayload {
  if (!data || typeof data !== "object") return false;
  const d = data as NutritionDashboardPayload;
  return (
    Array.isArray(d.mealsByType) &&
    typeof d.targets?.calories === "number" &&
    typeof d.consumed?.calories === "number"
  );
}

/** Fill missing fields so stale/partial caches never crash the UI. */
export function normalizeNutritionDashboard(
  data: Partial<NutritionDashboardPayload> | null | undefined
): NutritionDashboardPayload {
  const empty = createEmptyNutritionDashboard();
  if (!data || typeof data !== "object") return empty;

  const targets = {
    ...empty.targets,
    ...(data.targets ?? {}),
    calories: sanitizeCalorieTarget(data.targets?.calories) ?? 0,
    proteinG: Number(data.targets?.proteinG) || 0,
    carbsG: Number(data.targets?.carbsG) || 0,
    fatG: Number(data.targets?.fatG) || 0,
    fiberG: Number(data.targets?.fiberG) || 0,
    waterTargetMl: Number(data.targets?.waterTargetMl) || 2500,
  };

  const consumed = {
    ...empty.consumed,
    ...(data.consumed ?? {}),
    calories: coerceToKilocalories(data.consumed?.calories),
    proteinG: Number(data.consumed?.proteinG) || 0,
    carbsG: Number(data.consumed?.carbsG) || 0,
    fatG: Number(data.consumed?.fatG) || 0,
    fiberG: Number(data.consumed?.fiberG) || 0,
  };

  // Always recompute remaining. Trusting stale remaining=0 after day
  // rollover incorrectly shows "0 kcal übrig" when nothing was eaten yet.
  // Formula must match computeNutritionRemaining() in nutrition-display.ts.
  const exerciseBurned = {
    calories: sanitizeExerciseKcal(data.exerciseBurned?.calories),
    estimated: Boolean(data.exerciseBurned?.estimated),
  };
  const burned = exerciseBurned.calories;
  const remaining = {
    calories: Math.max(0, targets.calories - consumed.calories + burned),
    proteinG: Math.max(0, targets.proteinG - consumed.proteinG),
    carbsG: Math.max(0, targets.carbsG - consumed.carbsG),
    fatG: Math.max(0, targets.fatG - consumed.fatG),
  };

  const water = {
    consumedMl: Number(data.water?.consumedMl) || 0,
    targetMl: Number(data.water?.targetMl ?? targets.waterTargetMl) || 2500,
  };

  // Always keep all TRACK_MEAL_ORDER slots. An empty mealsByType array is
  // "valid JSON" but not a paintably usable dashboard — MealTrackList can
  // still render slots from TRACK_MEAL_ORDER, which must not trip the
  // global "Laden dauert zu lange" banner.
  const rawMeals = Array.isArray(data.mealsByType) ? data.mealsByType : [];
  const mealsByType =
    rawMeals.length > 0
      ? TRACK_MEAL_ORDER.map((mealType) => {
          const slot = rawMeals.find((m) => m.mealType === mealType);
          if (!slot) {
            return {
              mealType,
              mealId: null,
              totals: { calories: 0, proteinG: 0, carbsG: 0, fatG: 0 },
              items: [],
            };
          }
          return {
            mealType: slot.mealType,
            mealId: slot.mealId ?? null,
            totals: {
              calories: Number(slot.totals?.calories) || 0,
              proteinG: Number(slot.totals?.proteinG) || 0,
              carbsG: Number(slot.totals?.carbsG) || 0,
              fatG: Number(slot.totals?.fatG) || 0,
            },
            items: Array.isArray(slot.items)
              ? slot.items.map((item) => ({
                  ...item,
                  food: { name: item.food?.name ?? "Lebensmittel" },
                  calories: Number(item.calories) || 0,
                  proteinG: Number(item.proteinG) || 0,
                  quantityG: Number(item.quantityG) || 0,
                }))
              : [],
          };
        })
      : empty.mealsByType;

  return {
    date: typeof data.date === "string" ? data.date : empty.date,
    targets,
    consumed,
    remaining,
    exerciseBurned,
    water,
    mealsByType,
    favorites: Array.isArray(data.favorites) ? data.favorites : [],
    recents: Array.isArray(data.recents) ? data.recents : [],
    profileComplete: Boolean(data.profileComplete),
    empty: Boolean(data.empty),
  };
}
