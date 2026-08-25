import { startOfDay } from "date-fns";
import { prisma } from "@/lib/prisma";
import { loadNutritionDashboard } from "@/lib/nutrition-service";
import { macrosForQuantity, roundMacros, sumMacros } from "@/lib/food-macros";
import { getWeeklyFitnessIntelligence } from "@/lib/intelligence/weekly";
import type { NutritionDashboardPayload } from "@/lib/nutrition-defaults";
import type { SavedMealSummary } from "@/lib/saved-meals-cache";
import type { WeeklyNutritionSnapshot } from "@/lib/intelligence/weekly/types";

export type NutritionPerformanceLoadResult = {
  now: Date;
  dashboard: NutritionDashboardPayload | null;
  savedMeals: SavedMealSummary[];
  nutritionGoal: string | null;
  weeklyNutrition: WeeklyNutritionSnapshot | null;
};

async function loadSavedMealsForUser(userId: string): Promise<SavedMealSummary[]> {
  const recipes = await prisma.recipe.findMany({
    where: { userId, isMealTemplate: true },
    take: 8,
    orderBy: { updatedAt: "desc" },
    select: {
      id: true,
      name: true,
      servings: true,
      isMealTemplate: true,
      ingredients: {
        select: {
          quantityG: true,
          foodItemId: true,
          foodItem: {
            select: {
              name: true,
              calories: true,
              proteinG: true,
              carbsG: true,
              fatG: true,
              servingG: true,
            },
          },
        },
      },
    },
  });

  return recipes.map((r) => {
    const total = roundMacros(
      sumMacros(r.ingredients.map((i) => macrosForQuantity(i.foodItem, i.quantityG)))
    );
    const servings = r.servings || 1;
    return {
      id: r.id,
      name: r.name,
      servings,
      isMealTemplate: r.isMealTemplate,
      ingredients: r.ingredients.map((i) => ({
        foodItemId: i.foodItemId,
        name: i.foodItem.name,
        quantityG: i.quantityG,
      })),
      macros: {
        perServing: {
          calories: Math.round(total.calories / servings),
          proteinG: Math.round(total.proteinG / servings),
          carbsG: Math.round(total.carbsG / servings),
          fatG: Math.round(total.fatG / servings),
        },
        total,
      },
    };
  });
}

export async function loadNutritionPerformanceContext(
  userId: string,
  partial?: {
    now?: Date;
    dashboard?: NutritionDashboardPayload | null;
    savedMeals?: SavedMealSummary[];
    nutritionGoal?: string | null;
    weeklyNutrition?: WeeklyNutritionSnapshot | null;
  }
): Promise<NutritionPerformanceLoadResult> {
  const now = partial?.now ?? new Date();
  const today = startOfDay(now);

  const [dashboard, savedMeals, weeklyIntel] = await Promise.all([
    partial?.dashboard !== undefined
      ? Promise.resolve(partial.dashboard)
      : loadNutritionDashboard(userId, today).catch(() => null),
    partial?.savedMeals !== undefined
      ? Promise.resolve(partial.savedMeals)
      : loadSavedMealsForUser(userId).catch(() => [] as SavedMealSummary[]),
    partial?.weeklyNutrition !== undefined
      ? Promise.resolve(null)
      : getWeeklyFitnessIntelligence(userId).catch(() => null),
  ]);

  const weeklyNutrition =
    partial?.weeklyNutrition !== undefined
      ? partial.weeklyNutrition
      : weeklyIntel?.nutrition ?? null;

  return {
    now,
    dashboard,
    savedMeals,
    nutritionGoal:
      partial?.nutritionGoal ??
      dashboard?.targets?.nutritionGoal ??
      null,
    weeklyNutrition,
  };
}
