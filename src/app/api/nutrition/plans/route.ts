import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { jsonOk, jsonError, handleApiError } from "@/lib/api-response";
import {
  createNutritionPlan,
  listNutritionPlans,
} from "@/lib/nutrition-plans";
import { createNutritionPlanSchema } from "@/lib/nutrition-plan-validation";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) return jsonError("Nicht angemeldet", 401);
    const plans = await listNutritionPlans(session.user.id);
    return jsonOk({ plans });
  } catch (e) {
    return handleApiError(e);
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) return jsonError("Nicht angemeldet", 401);
    const body = await req.json();
    const parsed = createNutritionPlanSchema.safeParse(body);
    if (!parsed.success) return jsonError("Ungültige Eingabe");
    const plan = await createNutritionPlan(session.user.id, parsed.data);
    return jsonOk({ plan }, 201);
  } catch (e) {
    return handleApiError(e);
  }
}
