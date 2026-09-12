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
import { foodSnapshotFromConfirmed } from "@/lib/food/confirmed-macros";
import { roundMacros } from "@/lib/food-macros";

async function resolveFoodItemId(
  foodItemId: string | undefined,
  offCode: string | undefined,
  userId: string
): Promise<{ id: string } | { error: string } | null> {
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
  return null;
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) return jsonError("Nicht angemeldet", 401);
    const body = await req.json();
    const parsed = quickAddFoodSchema.safeParse(body);
    if (!parsed.success) return jsonError("Ungültige Eingabe");

    const day = resolveNutritionDay({ date: parsed.data.date ?? null });
    const date = day.date;
    const meal = await getOrCreateMeal(
      session.user.id,
      date,
      parsed.data.mealType
    );

    let foodId: string | null = null;

    // Prefer the exact macros the user confirmed — never silently swap OFF values.
    if (parsed.data.confirmed) {
      const confirmed = roundMacros(parsed.data.confirmed);
      let baseName = parsed.data.confirmed.name?.trim() || "Lebensmittel";
      let baseBrand = parsed.data.confirmed.brand ?? null;

      if (parsed.data.foodItemId) {
        const existing = await prisma.foodItem.findFirst({
          where: {
            id: parsed.data.foodItemId,
            ...accessibleFoodItemFilter(session.user.id),
          },
          select: { name: true, brand: true },
        });
        if (existing) {
          baseName = existing.name;
          baseBrand = existing.brand;
        }
      }

      const snap = foodSnapshotFromConfirmed(
        baseName,
        confirmed,
        parsed.data.quantityG,
        { brand: baseBrand }
      );
      const slug = `log-${session.user.id}-${Date.now()}-${Math.random()
        .toString(36)
        .slice(2, 8)}`;
      const created = await prisma.foodItem.create({
        data: {
          slug,
          name: snap.name,
          brand: snap.brand,
          calories: snap.calories,
          proteinG: snap.proteinG,
          carbsG: snap.carbsG,
          fatG: snap.fatG,
          fiberG: snap.fiberG,
          servingG: snap.servingG,
          dataSource: "user_log_snapshot",
          userId: session.user.id,
        },
        select: { id: true },
      });
      foodId = created.id;
    } else {
      const foodResolved = await resolveFoodItemId(
        parsed.data.foodItemId,
        parsed.data.offCode,
        session.user.id
      );
      if (!foodResolved) return jsonError("foodItemId oder offCode erforderlich");
      if ("error" in foodResolved) return jsonError(foodResolved.error, 404);

      const food = await prisma.foodItem.findFirst({
        where: {
          id: foodResolved.id,
          ...accessibleFoodItemFilter(session.user.id),
        },
        select: { id: true },
      });
      if (!food) return jsonError("Lebensmittel nicht gefunden", 404);
      foodId = food.id;
    }

    await prisma.mealItem.create({
      data: {
        mealId: meal.id,
        foodItemId: foodId,
        quantityG: parsed.data.quantityG,
      },
    });
    await recordFoodRecent(session.user.id, foodId);

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
