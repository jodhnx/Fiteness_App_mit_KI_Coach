import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { jsonOk, jsonError, handleApiError } from "@/lib/api-response";
import {
  deleteNutritionPlan,
  duplicateNutritionPlan,
  getOwnedPlan,
  serializePlanDetail,
  updateNutritionPlanMeta,
} from "@/lib/nutrition-plans";
import { patchNutritionPlanSchema } from "@/lib/nutrition-plan-validation";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, ctx: Ctx) {
  try {
    const session = await auth();
    if (!session?.user?.id) return jsonError("Nicht angemeldet", 401);
    const { id } = await ctx.params;
    const plan = await getOwnedPlan(session.user.id, id);
    if (!plan) return jsonError("Plan nicht gefunden", 404);
    return jsonOk({ plan: serializePlanDetail(plan) });
  } catch (e) {
    return handleApiError(e);
  }
}

export async function PATCH(req: NextRequest, ctx: Ctx) {
  try {
    const session = await auth();
    if (!session?.user?.id) return jsonError("Nicht angemeldet", 401);
    const { id } = await ctx.params;
    const body = await req.json();
    const parsed = patchNutritionPlanSchema.safeParse(body);
    if (!parsed.success) return jsonError("Ungültige Eingabe");

    if (parsed.data.action === "duplicate") {
      const plan = await duplicateNutritionPlan(session.user.id, id);
      if (!plan) return jsonError("Plan nicht gefunden", 404);
      return jsonOk({ plan });
    }

    const patch = { ...parsed.data };
    if (parsed.data.action === "archive") {
      patch.status = "ARCHIVED";
      patch.isActive = false;
    }
    if (parsed.data.action === "activate") {
      patch.status = "ACTIVE";
      patch.isActive = true;
    }
    delete patch.action;

    const plan = await updateNutritionPlanMeta(session.user.id, id, patch);
    if (!plan) return jsonError("Plan nicht gefunden", 404);
    return jsonOk({ plan });
  } catch (e) {
    return handleApiError(e);
  }
}

export async function DELETE(_req: NextRequest, ctx: Ctx) {
  try {
    const session = await auth();
    if (!session?.user?.id) return jsonError("Nicht angemeldet", 401);
    const { id } = await ctx.params;
    const ok = await deleteNutritionPlan(session.user.id, id);
    if (!ok) return jsonError("Plan nicht gefunden", 404);
    return jsonOk({ ok: true });
  } catch (e) {
    return handleApiError(e);
  }
}
