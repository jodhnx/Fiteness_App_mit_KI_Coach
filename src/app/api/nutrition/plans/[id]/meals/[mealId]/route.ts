import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { jsonOk, jsonError, handleApiError } from "@/lib/api-response";
import { deletePlanMeal } from "@/lib/nutrition-plans";

type Ctx = { params: Promise<{ id: string; mealId: string }> };

export async function DELETE(_req: NextRequest, ctx: Ctx) {
  try {
    const session = await auth();
    const userId = session?.user?.id;
    if (!userId) return jsonError("Nicht angemeldet", 401);
    const params = await ctx.params;
    const mealId = params.mealId;
    if (!mealId) return jsonError("Ungültige Anfrage");
    const result = await deletePlanMeal(userId, mealId);
    if (result.error) return jsonError(result.error, 404);
    return jsonOk(result);
  } catch (e) {
    return handleApiError(e);
  }
}
