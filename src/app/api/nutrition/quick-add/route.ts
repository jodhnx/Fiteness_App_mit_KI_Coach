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
import { resolveNutritionDay } from "@/lib/nutrition-day";
import { importOffProductByCode } from "@/lib/food/food-database-service";
import {
  accessibleFoodItemFilter,
  findAccessibleFoodItemId,
} from "@/lib/food/food-access";
import { updateNutritionStreak, loadNutritionStreak } from "@/lib/nutrition-streak";

async function resolveFoodItemId(
  foodItemId: string | undefined,
  offCode: string | undefined,
  userId: string
): Promise<{ id: string } | { error: string }> {
  if (foodItemId) {
    const accessibleId = await findAccessibleFoodItemId(foodItemId, userId);
    if (accessibleId) return { id: accessibleId };
  }
  const code = offCode?.replace(/\D/g, "");
  if (code && code.length >= 8) {
    const imported = await importOffProductByCode(code, userId);
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

    const foodResolved = await resolveFoodItemId(
      parsed.data.foodItemId,
      parsed.data.offCode,
      session.user.id
    );
    if ("error" in foodResolved) return jsonError(foodResolved.error, 404);

    const food = await prisma.foodItem.findFirst({
      where: {
        id: foodResolved.id,
        ...accessibleFoodItemFilter(session.user.id),
      },
      select: { id: true },
    });
    if (!food) return jsonError("Lebensmittel nicht gefunden", 404);

    const day = resolveNutritionDay({ date: parsed.data.date ?? null });
    const date = day.date;
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

    await updateNutritionStreak(session.user.id, date);

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
    const streak = await loadNutritionStreak(session.user.id);
    try {
      const { revalidateTag } = await import("next/cache");
      revalidateTag(`home-${session.user.id}`);
    } catch {
      /* ignore */
    }
    return jsonOk(
      { ok: true, dashboard, nutritionStreak: streak.effectiveDays },
      201
    );
  } catch (e) {
    return handleApiError(e);
  }
}
