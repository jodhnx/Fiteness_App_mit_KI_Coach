import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { jsonOk, jsonError, handleApiError } from "@/lib/api-response";
import { quickAddFoodSchema } from "@/lib/validations";
import {
  getOrCreateMeal,
  recordFoodRecent,
  loadNutritionDashboard,
} from "@/lib/nutrition-service";
import { startOfDay } from "date-fns";
import { importOffProductByCode } from "@/lib/food/food-database-service";

async function resolveFoodItemId(
  foodItemId: string | undefined,
  offCode: string | undefined
): Promise<{ id: string } | { error: string }> {
  if (foodItemId) {
    const existing = await prisma.foodItem.findUnique({ where: { id: foodItemId } });
    if (existing) return { id: existing.id };
  }
  const code = offCode?.replace(/\D/g, "");
  if (code && code.length >= 8) {
    const imported = await importOffProductByCode(code);
    if (imported.product?.id) return { id: imported.product.id };
    return { error: imported.error ?? "Produkt konnte nicht importiert werden" };
  }
  if (foodItemId) return { error: "Lebensmittel nicht gefunden" };
  return { error: "foodItemId oder offCode erforderlich" };
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) return jsonError("Nicht angemeldet", 401);
    const body = await req.json();
    const parsed = quickAddFoodSchema.safeParse(body);
    if (!parsed.success) return jsonError("Ungültige Eingabe");

    const resolved = await resolveFoodItemId(
      parsed.data.foodItemId,
      parsed.data.offCode
    );
    if ("error" in resolved) return jsonError(resolved.error, 404);

    const food = await prisma.foodItem.findUnique({
      where: { id: resolved.id },
    });
    if (!food) return jsonError("Lebensmittel nicht gefunden", 404);

    const date = startOfDay(
      parsed.data.date ? new Date(parsed.data.date) : new Date()
    );
    const meal = await getOrCreateMeal(
      session.user.id,
      date,
      parsed.data.mealType
    );

    await prisma.mealItem.create({
      data: {
        mealId: meal.id,
        foodItemId: food.id,
        quantityG: parsed.data.quantityG,
      },
    });
    await recordFoodRecent(session.user.id, food.id);

    const dashboard = await loadNutritionDashboard(session.user.id, date);
    const { awardXPForAction } = await import("@/lib/gamification");
    const c = dashboard.consumed.calories;
    const t = dashboard.targets.calories;
    if (c >= t * 0.92 && c <= t * 1.08) {
      await awardXPForAction(session.user.id, "CALORIE_GOAL");
    }
    if (dashboard.consumed.proteinG >= dashboard.targets.proteinG * 0.95) {
      await awardXPForAction(session.user.id, "PROTEIN_GOAL");
    }
    return jsonOk({ ok: true, dashboard }, 201);
  } catch (e) {
    return handleApiError(e);
  }
}
