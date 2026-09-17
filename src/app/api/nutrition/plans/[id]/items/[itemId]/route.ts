import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { jsonOk, jsonError, handleApiError } from "@/lib/api-response";
import {
  deletePlanItem,
  logPlanItemAsEaten,
  patchPlanItem,
} from "@/lib/nutrition-plans";
import {
  logPlanItemSchema,
  patchPlanItemSchema,
} from "@/lib/nutrition-plan-validation";

type Ctx = { params: Promise<{ id: string; itemId: string }> };

export async function PATCH(req: NextRequest, ctx: Ctx) {
  try {
    const session = await auth();
    const userId = session?.user?.id;
    if (!userId) return jsonError("Nicht angemeldet", 401);
    const params = await ctx.params;
    const itemId = params.itemId;
    if (!itemId) return jsonError("Ungültige Anfrage");
    const body = await req.json();

    if (body?.action === "log-eaten") {
      const parsed = logPlanItemSchema.safeParse(body);
      if (!parsed.success) return jsonError("Ungültige Eingabe");
      const result = await logPlanItemAsEaten(
        userId,
        itemId,
        parsed.data.mealType,
        parsed.data.date ?? null
      );
      if (result.error) return jsonError(result.error, 404);
      return jsonOk(result);
    }

    const parsed = patchPlanItemSchema.safeParse(body);
    if (!parsed.success) return jsonError("Ungültige Eingabe");
    const result = await patchPlanItem(userId, itemId, parsed.data);
    if (result.error) return jsonError(result.error, 404);
    return jsonOk(result);
  } catch (e) {
    return handleApiError(e);
  }
}

export async function DELETE(_req: NextRequest, ctx: Ctx) {
  try {
    const session = await auth();
    const userId = session?.user?.id;
    if (!userId) return jsonError("Nicht angemeldet", 401);
    const params = await ctx.params;
    const itemId = params.itemId;
    if (!itemId) return jsonError("Ungültige Anfrage");
    const result = await deletePlanItem(userId, itemId);
    if (result.error) return jsonError(result.error, 404);
    return jsonOk(result);
  } catch (e) {
    return handleApiError(e);
  }
}
