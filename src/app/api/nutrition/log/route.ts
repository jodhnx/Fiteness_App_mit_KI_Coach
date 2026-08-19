/**
 * POST /api/nutrition/log
 * Log a food item (custom or from Food AI) directly, without requiring a foodItemId.
 */
import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { jsonOk, jsonError, handleApiError } from "@/lib/api-response";
import { getOrCreateMeal, loadNutritionDashboard } from "@/lib/nutrition-service";
import { startOfDay } from "date-fns";
import type { MealType } from "@prisma/client";

const VALID_MEAL_TYPES = new Set<string>(["BREAKFAST", "LUNCH", "DINNER", "SNACK"]);

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

    const date = startOfDay(body.date ? new Date(body.date) : new Date());

    // Create an inline FoodItem (per 100g normalised from the provided quantity)
    const factor = 100 / quantityG;
    const foodItem = await prisma.foodItem.create({
      data: {
        name,
        brand: body.source === "food-ai" ? "Food AI" : null,
        calories: Math.round(calories * factor),
        proteinG: Number((proteinG * factor).toFixed(2)),
        carbsG: Number((carbsG * factor).toFixed(2)),
        fatG: Number((fatG * factor).toFixed(2)),
        servingG: 100,
        source: "local",
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

    const dashboard = await loadNutritionDashboard(session.user.id, date);
    return jsonOk({ ok: true, dashboard }, 201);
  } catch (e) {
    return handleApiError(e);
  }
}
