import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { jsonOk, jsonError, handleApiError } from "@/lib/api-response";
import { logSavedMealToDiary } from "@/lib/nutrition-log-saved-meal";
import type { MealType } from "@prisma/client";
import { z } from "zod";

const schema = z.object({
  mealType: z.enum(["BREAKFAST", "LUNCH", "DINNER", "SNACK"]),
  date: z.string().optional(),
});

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) return jsonError("Nicht angemeldet", 401);
    const { id } = await params;
    const body = await req.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) return jsonError("Ungültige Eingabe", 400);

    const result = await logSavedMealToDiary(
      session.user.id,
      id,
      parsed.data.mealType as MealType,
      parsed.data.date ? new Date(parsed.data.date) : new Date()
    );
    if ("error" in result && result.error) return jsonError(result.error, 404);
    return jsonOk(result);
  } catch (e) {
    return handleApiError(e);
  }
}
