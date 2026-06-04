import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { jsonOk, jsonError, handleApiError } from "@/lib/api-response";
import { loadNutritionDashboard } from "@/lib/nutrition-service";
import { startOfDay } from "date-fns";
import { z } from "zod";

const patchSchema = z.object({
  quantityG: z.coerce.number().positive().max(5000),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) return jsonError("Nicht angemeldet", 401);
    const { id } = await params;
    const body = await req.json();
    const parsed = patchSchema.safeParse(body);
    if (!parsed.success) return jsonError("Ungültige Menge");

    const item = await prisma.mealItem.findFirst({
      where: { id, meal: { userId: session.user.id } },
      include: { meal: true, foodItem: true },
    });
    if (!item) return jsonError("Eintrag nicht gefunden", 404);

    await prisma.mealItem.update({
      where: { id },
      data: { quantityG: parsed.data.quantityG },
    });

    const dashboard = await loadNutritionDashboard(
      session.user.id,
      startOfDay(item.meal.date)
    );
    return jsonOk({ ok: true, dashboard });
  } catch (e) {
    return handleApiError(e);
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) return jsonError("Nicht angemeldet", 401);
    const { id } = await params;
    const item = await prisma.mealItem.findFirst({
      where: { id, meal: { userId: session.user.id } },
      include: { meal: true },
    });
    if (!item) return jsonError("Eintrag nicht gefunden", 404);
    await prisma.mealItem.delete({ where: { id } });
    const dashboard = await loadNutritionDashboard(
      session.user.id,
      startOfDay(item.meal.date)
    );
    return jsonOk({ ok: true, dashboard });
  } catch (e) {
    return handleApiError(e);
  }
}
