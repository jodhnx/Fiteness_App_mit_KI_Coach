import type { MealType, NutritionGoal } from "@prisma/client";
import { format, startOfDay } from "date-fns";
import { TRACK_MEAL_ORDER } from "@/lib/meal-types";

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
  water: { consumedMl: number; targetMl: number };
  mealsByType: {
    mealType: MealType;
    mealId: string | null;
    totals: { calories: number; proteinG: number; carbsG: number; fatG: number };
    items: {
      id: string;
      quantityG: number;
      food: { name: string };
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
    remaining: { ...targets },
    water: { consumedMl: 0, targetMl: targets.waterTargetMl },
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
