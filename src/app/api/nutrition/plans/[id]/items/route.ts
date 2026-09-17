import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { jsonOk, jsonError, handleApiError } from "@/lib/api-response";
import {
  addFoodProductToMeal,
  addItemToMeal,
  addSavedMealToPlanMeal,
} from "@/lib/nutrition-plans";
import { addPlanItemSchema } from "@/lib/nutrition-plan-validation";
import { roundMacros } from "@/lib/food-macros";

type Ctx = { params: Promise<{ id: string }> };

export async function POST(req: NextRequest, ctx: Ctx) {
  try {
    const session = await auth();
    const userId = session?.user?.id;
    if (!userId) return jsonError("Nicht angemeldet", 401);
    await ctx.params;
    const body = await req.json();
    const parsed = addPlanItemSchema.safeParse(body);
    if (!parsed.success) return jsonError("Ungültige Eingabe");
    const data = parsed.data;
    const mealId = data.mealId;

    if (typeof data.savedMealId === "string" && data.savedMealId.length > 0) {
      const result = await addSavedMealToPlanMeal(
        userId,
        mealId,
        data.savedMealId
      );
      if (result.error) return jsonError(result.error, 404);
      return jsonOk(result, 201);
    }

    if (
      typeof data.foodItemId === "string" &&
      data.foodItemId.length > 0 &&
      data.quantityG != null &&
      !data.confirmed
    ) {
      const result = await addFoodProductToMeal(
        userId,
        mealId,
        data.foodItemId,
        data.quantityG
      );
      if (result.error) return jsonError(result.error, 404);
      return jsonOk(result, 201);
    }

    const quantityG = data.quantityG ?? 100;
    let macros = roundMacros({
      calories: data.calories ?? 0,
      proteinG: data.proteinG ?? 0,
      carbsG: data.carbsG ?? 0,
      fatG: data.fatG ?? 0,
    });
    let name = data.nameSnapshot ?? "Lebensmittel";
    let brand = data.brandSnapshot ?? null;

    if (data.confirmed) {
      macros = roundMacros({
        calories: data.confirmed.calories,
        proteinG: data.confirmed.proteinG,
        carbsG: data.confirmed.carbsG,
        fatG: data.confirmed.fatG,
      });
      name = data.confirmed.name?.trim() || name;
      brand = data.confirmed.brand ?? brand;
    }

    if (!name.trim()) return jsonError("Name fehlt");

    const result = await addItemToMeal(userId, mealId, {
      foodItemId: data.foodItemId ?? null,
      recipeId: data.recipeId ?? null,
      nameSnapshot: name,
      brandSnapshot: brand,
      quantityG,
      unit: data.unit ?? "g",
      calories: macros.calories,
      proteinG: macros.proteinG,
      carbsG: macros.carbsG,
      fatG: macros.fatG,
      fiberG: data.fiberG,
    });
    if (result.error) return jsonError(result.error, 404);
    return jsonOk(result, 201);
  } catch (e) {
    return handleApiError(e);
  }
}
