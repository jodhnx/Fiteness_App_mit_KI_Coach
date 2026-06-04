import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { jsonOk, jsonError, handleApiError } from "@/lib/api-response";
import { loadNutritionDashboard } from "@/lib/nutrition-service";
import { startOfDay } from "date-fns";

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) return jsonError("Nicht angemeldet", 401);
    const { id } = await params;
    const meal = await prisma.meal.findFirst({
      where: { id, userId: session.user.id },
    });
    if (!meal) return jsonError("Mahlzeit nicht gefunden", 404);

    await prisma.meal.delete({ where: { id } });
    const dashboard = await loadNutritionDashboard(
      session.user.id,
      startOfDay(meal.date)
    );
    return jsonOk({ ok: true, dashboard });
  } catch (e) {
    return handleApiError(e);
  }
}
