import type { MealType, NutritionPlanStatus } from "@prisma/client";
import type { MacroTotals } from "@/lib/food-macros";

export type PlanItemDto = {
  id: string;
  mealId: string;
  foodItemId: string | null;
  recipeId: string | null;
  nameSnapshot: string;
  brandSnapshot: string | null;
  quantityG: number;
  unit: string;
  calories: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  fiberG: number | null;
  sortOrder: number;
};

export type PlanMealDto = {
  id: string;
  dayId: string;
  mealType: MealType;
  title: string | null;
  sortOrder: number;
  items: PlanItemDto[];
  totals: MacroTotals;
};

export type PlanDayDto = {
  id: string;
  dayNumber: number;
  date: string | null;
  meals: PlanMealDto[];
  totals: MacroTotals;
  mealCount: number;
  itemCount: number;
};

export type PlanDetailDto = {
  id: string;
  name: string;
  description: string | null;
  durationDays: number;
  startDate: string | null;
  status: NutritionPlanStatus;
  isActive: boolean;
  targetCalories: number;
  targetProteinG: number;
  targetCarbsG: number;
  targetFatG: number;
  createdAt: string;
  updatedAt: string;
  days: PlanDayDto[];
  weekAverage: MacroTotals;
  totalMeals: number;
  totalItems: number;
};

export type PlanListItemDto = {
  id: string;
  name: string;
  durationDays: number;
  status: NutritionPlanStatus;
  isActive: boolean;
  targetCalories: number;
  targetProteinG: number;
  targetCarbsG: number;
  targetFatG: number;
  mealCount: number;
  itemCount: number;
  progressDays: number;
  createdAt: string;
  updatedAt: string;
};
