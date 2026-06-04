import { prisma } from "@/lib/prisma";
import type { MealType } from "@prisma/client";
import {
  getOrCreateMeal,
  recordFoodRecent,
  loadNutritionDashboard,
} from "@/lib/nutrition-service";
import { startOfDay } from "date-fns";

export async function logSavedMealToDiary(
  userId: string,
  recipeId: string,
  mealType: MealType,
  date = new Date()
) {
  const recipe = await prisma.recipe.findFirst({
    where: { id: recipeId, userId },
    include: { ingredients: { include: { foodItem: true } } },
  });
  if (!recipe) return { error: "Mahlzeit nicht gefunden" as const };

  const day = startOfDay(date);
  const meal = await getOrCreateMeal(userId, day, mealType);

  for (const ing of recipe.ingredients) {
    await prisma.mealItem.create({
      data: {
        mealId: meal.id,
        foodItemId: ing.foodItemId,
        quantityG: ing.quantityG,
      },
    });
    await recordFoodRecent(userId, ing.foodItemId);
  }

  const dashboard = await loadNutritionDashboard(userId, day);
  return { dashboard, recipeName: recipe.name };
}
