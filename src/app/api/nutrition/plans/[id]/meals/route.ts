import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { jsonOk, jsonError, handleApiError } from "@/lib/api-response";
import {
  addMealToDay,
  clearPlanDay,
  duplicatePlanDay,
} from "@/lib/nutrition-plans";
import {
  addPlanMealSchema,
  duplicatePlanDaySchema,
} from "@/lib/nutrition-plan-validation";
import { z } from "zod";

type Ctx = { params: Promise<{ id: string }> };

const clearSchema = z.object({
  action: z.literal("clear"),
  dayId: z.string().min(1),
});

export async function POST(req: NextRequest, ctx: Ctx) {
  try {
    const session = await auth();
    const userId = session?.user?.id;
    if (!userId) return jsonError("Nicht angemeldet", 401);
    await ctx.params;
    const body = await req.json();

    if (body?.action === "duplicate-day") {
      const parsed = duplicatePlanDaySchema.safeParse(body);
      if (!parsed.success) return jsonError("Ungültige Eingabe");
      const result = await duplicatePlanDay(
        userId,
        parsed.data.sourceDayId,
        parsed.data.targetDayId
      );
      if (result.error) return jsonError(result.error, 404);
      return jsonOk(result);
    }

    if (body?.action === "clear") {
      const parsed = clearSchema.safeParse(body);
      if (!parsed.success) return jsonError("Ungültige Eingabe");
      const result = await clearPlanDay(userId, parsed.data.dayId);
      if (result.error) return jsonError(result.error, 404);
      return jsonOk(result);
    }

    const parsed = addPlanMealSchema.safeParse(body);
    if (!parsed.success) return jsonError("Ungültige Eingabe");
    const result = await addMealToDay(
      userId,
      parsed.data.dayId,
      parsed.data.mealType,
      parsed.data.title
    );
    if (result.error) return jsonError(result.error, 404);
    return jsonOk(result, 201);
  } catch (e) {
    return handleApiError(e);
  }
}
