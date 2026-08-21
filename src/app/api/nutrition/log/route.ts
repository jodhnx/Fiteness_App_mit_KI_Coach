/**
 * POST /api/nutrition/log
 * Log a food item (custom or from Food AI) directly, without requiring a foodItemId.
 */
import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { jsonOk, jsonError, handleApiError } from "@/lib/api-response";
import { getOrCreateMeal, loadNutritionDashboard, recordFoodRecent } from "@/lib/nutrition-service";
import { startOfDay } from "date-fns";
import type { MealType } from "@prisma/client";

const VALID_MEAL_TYPES = new Set<string>(["BREAKFAST", "LUNCH", "DINNER", "SNACK"]);

function makeSlug(name: string): string {
  return `ai-${name}-${Date.now()}`
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .slice(0, 100);
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) return jsonError("Nicht angemeldet", 401);

    const body = (await req.json()) as {
      mealType?: string;
      name?: string;
      quantityG?: number;
      calories?: number;
      proteinG?: number;
      carbsG?: number;
      fatG?: number;
      source?: string;
      date?: string;
    };

    const mealType = body.mealType;
    if (!mealType || !VALID_MEAL_TYPES.has(mealType)) {
      return jsonError("Ungültiger mealType");
    }
    const name = body.name?.trim();
    if (!name) return jsonError("Name fehlt");

    const quantityG = Number(body.quantityG) || 100;
    const calories = Math.max(0, Number(body.calories) || 0);
    const proteinG = Math.max(0, Number(body.proteinG) || 0);
    const carbsG = Math.max(0, Number(body.carbsG) || 0);
    const fatG = Math.max(0, Number(body.fatG) || 0);
    const isFoodAI = body.source === "food-ai";

    const date = startOfDay(body.date ? new Date(body.date) : new Date());

    // Normalise to per-100g for the FoodItem catalog entry
    const factor = 100 / quantityG;
    const foodItem = await prisma.foodItem.create({
      data: {
        slug: makeSlug(name),
        name,
        brand: isFoodAI ? "Food AI" : null,
        calories: Math.round(calories * factor),
        proteinG: Number((proteinG * factor).toFixed(2)),
        carbsG: Number((carbsG * factor).toFixed(2)),
        fatG: Number((fatG * factor).toFixed(2)),
        servingG: 100,
        dataSource: isFoodAI ? "food-ai" : "local",
        userId: session.user.id,
      },
    });

    const meal = await getOrCreateMeal(session.user.id, date, mealType as MealType);
    await prisma.mealItem.create({
      data: {
        mealId: meal.id,
        foodItemId: foodItem.id,
        quantityG,
      },
    });

    await recordFoodRecent(session.user.id, foodItem.id).catch(() => undefined);

    const dashboard = await loadNutritionDashboard(session.user.id, date);
    return jsonOk({ ok: true, dashboard }, 201);
  } catch (e) {
    return handleApiError(e);
  }
}
