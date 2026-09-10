import { prisma } from "@/lib/prisma";
import type { MealType } from "@prisma/client";
import {
  getOrCreateMeal,
  recordFoodRecent,
  loadNutritionDashboard,
} from "@/lib/nutrition-service";
import { resolveNutritionDay } from "@/lib/nutrition-day";
import { updateNutritionStreak, loadNutritionStreak } from "@/lib/nutrition-streak";

export async function logSavedMealToDiary(
  userId: string,
  recipeId: string,
  mealType: MealType,
  dateInput?: string | Date | null
) {
  const recipe = await prisma.recipe.findFirst({
    where: { id: recipeId, userId },
    include: { ingredients: { include: { foodItem: true } } },
  });
  if (!recipe) return { error: "Mahlzeit nicht gefunden" as const };

  const ymd =
    typeof dateInput === "string"
      ? dateInput
      : dateInput instanceof Date
        ? dateInput.toISOString().slice(0, 10)
        : null;
  const day = resolveNutritionDay({ date: ymd });
  const meal = await getOrCreateMeal(userId, day.date, mealType);

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

  await updateNutritionStreak(userId, day.date);
  const streak = await loadNutritionStreak(userId);
  const dashboard = await loadNutritionDashboard(userId, day.date);
  try {
    const { revalidateTag } = await import("next/cache");
    revalidateTag(`home-${userId}`);
  } catch {
    /* ignore */
  }
  return {
    dashboard,
    recipeName: recipe.name,
    nutritionStreak: streak.effectiveDays,
  };
}
