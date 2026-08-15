import { NextRequest } from "next/server";
import { z } from "zod";
import { startOfDay } from "date-fns";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { jsonOk, jsonError, handleApiError } from "@/lib/api-response";
import {
  getFitnessRecipe,
  recipeMacrosPer100g,
  recipeServingGrams,
} from "@/data/fitness-recipes";
import {
  getOrCreateMeal,
  recordFoodRecent,
  loadNutritionDashboard,
} from "@/lib/nutrition-service";

const schema = z.object({
  recipeId: z.string().min(1),
  mealType: z.enum(["BREAKFAST", "LUNCH", "DINNER", "SNACK"]),
});

/** Log a catalog recipe into today's nutrition for the selected meal. */
export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) return jsonError("Nicht angemeldet", 401);

    const body = await req.json().catch(() => ({}));
    const parsed = schema.safeParse(body);
    if (!parsed.success) return jsonError("Ungültige Eingabe");

    const recipe = getFitnessRecipe(parsed.data.recipeId);
    if (!recipe) return jsonError("Rezept nicht gefunden", 404);

    const slug = `catalog-recipe-${recipe.id}`;
    const per100 = recipeMacrosPer100g(recipe);
    const servingG = recipeServingGrams(recipe);

    let food = await prisma.foodItem.findUnique({ where: { slug } });
    if (!food) {
      food = await prisma.foodItem.create({
        data: {
          slug,
          name: recipe.name,
          brand: "NEXFORM Rezept",
          category: "FITNESS",
          calories: per100.calories,
          proteinG: per100.proteinG,
          carbsG: per100.carbsG,
          fatG: per100.fatG,
          fiberG: per100.fiberG,
          servingG,
          dataSource: "recipe-catalog",
        },
      });
    }

    const date = startOfDay(new Date());
    const meal = await getOrCreateMeal(
      session.user.id,
      date,
      parsed.data.mealType
    );

    await prisma.mealItem.create({
      data: {
        mealId: meal.id,
        foodItemId: food.id,
        quantityG: servingG,
      },
    });
    await recordFoodRecent(session.user.id, food.id);

    const dashboard = await loadNutritionDashboard(session.user.id, date);
    return jsonOk({ ok: true, dashboard, recipeName: recipe.name }, 201);
  } catch (e) {
    return handleApiError(e);
  }
}
