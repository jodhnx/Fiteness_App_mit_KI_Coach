/**
 * POST /api/nutrition/log
 * Log one food item, or an atomic batch (`items[]`) for Food AI.
 */
import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { jsonOk, jsonError, handleApiError } from "@/lib/api-response";
import { loadNutritionDashboard } from "@/lib/nutrition-service";
import {
  loadNutritionStreak,
  updateNutritionStreak,
} from "@/lib/nutrition-streak";
import { resolveNutritionDay } from "@/lib/nutrition-day";
import type { MealType } from "@prisma/client";

const VALID_MEAL_TYPES = new Set<string>([
  "BREAKFAST",
  "LUNCH",
  "DINNER",
  "SNACK",
]);

const MEAL_LABELS: Record<string, string> = {
  BREAKFAST: "Frühstück",
  LUNCH: "Mittagessen",
  DINNER: "Abendessen",
  SNACK: "Snack",
};

function makeSlug(name: string, salt: string): string {
  return `ai-${name}-${salt}`
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .slice(0, 100);
}

type LogItemInput = {
  name?: string;
  quantityG?: number;
  calories?: number;
  proteinG?: number;
  carbsG?: number;
  fatG?: number;
};

function normalizeItem(raw: LogItemInput) {
  const name = raw.name?.trim();
  if (!name) return null;
  return {
    name,
    quantityG: Math.min(5000, Math.max(1, Number(raw.quantityG) || 100)),
    calories: Math.min(10_000, Math.max(0, Number(raw.calories) || 0)),
    proteinG: Math.min(1000, Math.max(0, Number(raw.proteinG) || 0)),
    carbsG: Math.min(1000, Math.max(0, Number(raw.carbsG) || 0)),
    fatG: Math.min(1000, Math.max(0, Number(raw.fatG) || 0)),
  };
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) return jsonError("Nicht angemeldet", 401);
    const userId = session.user.id;

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
      items?: LogItemInput[];
    };

    const mealType = body.mealType;
    if (!mealType || !VALID_MEAL_TYPES.has(mealType)) {
      return jsonError("Ungültiger mealType");
    }

    const source = typeof body.source === "string" ? body.source : "";
    const isFoodAI = source === "food-ai";
    const isQuickEntry = source === "quick-entry";

    const batchRaw = Array.isArray(body.items) ? body.items : null;
    const items = batchRaw
      ? batchRaw.map(normalizeItem).filter((x): x is NonNullable<typeof x> => x != null)
      : (() => {
          const one = normalizeItem(body);
          return one ? [one] : [];
        })();

    if (!items.length) return jsonError("Name fehlt");
    if (items.length > 20) return jsonError("Zu viele Positionen");

    const resolved = resolveNutritionDay({ date: body.date ?? null });
    const date = resolved.date;
    const stamp = `${Date.now()}`;

    await prisma.$transaction(async (tx) => {
      const meal = await tx.meal.upsert({
        where: {
          userId_date_mealType: {
            userId,
            date,
            mealType: mealType as MealType,
          },
        },
        create: {
          userId,
          date,
          mealType: mealType as MealType,
          name: MEAL_LABELS[mealType] ?? mealType,
        },
        update: {},
      });

      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        // Store servingG = quantity with exact confirmed totals so dashboard
        // macrosForQuantity(food, quantityG) returns the same preview numbers.
        const foodItem = await tx.foodItem.create({
          data: {
            slug: makeSlug(item.name, `${stamp}-${i}`),
            name: isQuickEntry ? "Schnelleintrag" : item.name,
            brand: isFoodAI
              ? "Food AI"
              : isQuickEntry
                ? "Schnelleintrag"
                : null,
            calories: Math.round(item.calories),
            proteinG: Math.round(item.proteinG * 10) / 10,
            carbsG: Math.round(item.carbsG * 10) / 10,
            fatG: Math.round(item.fatG * 10) / 10,
            servingG: item.quantityG,
            dataSource: isFoodAI
              ? "food-ai"
              : isQuickEntry
                ? "quick-entry"
                : "local",
            userId,
          },
        });

        await tx.mealItem.create({
          data: {
            mealId: meal.id,
            foodItemId: foodItem.id,
            quantityG: item.quantityG,
          },
        });

        try {
          await tx.foodRecent.upsert({
            where: {
              userId_foodItemId: { userId, foodItemId: foodItem.id },
            },
            create: { userId, foodItemId: foodItem.id, useCount: 1 },
            update: {
              useCount: { increment: 1 },
              lastUsedAt: new Date(),
            },
          });
        } catch {
          /* recent is non-critical */
        }
      }
    });

    await updateNutritionStreak(userId, date);

    const dashboard = await loadNutritionDashboard(userId, date);
    const streak = await loadNutritionStreak(userId);
    try {
      const { revalidateTag } = await import("next/cache");
      revalidateTag(`home-${userId}`);
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
