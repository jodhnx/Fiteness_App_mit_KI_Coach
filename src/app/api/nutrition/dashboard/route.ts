import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { jsonOk, jsonError, handleApiError } from "@/lib/api-response";
import { loadNutritionDashboard } from "@/lib/nutrition-service";
import { startOfDay } from "date-fns";

export async function GET(req: NextRequest) {
  const started = Date.now();
  try {
    const session = await auth();
    if (!session?.user?.id) return jsonError("Nicht angemeldet", 401);
    const dateParam = req.nextUrl.searchParams.get("date");
    const date = dateParam ? startOfDay(new Date(dateParam)) : startOfDay(new Date());
    const dashboard = await loadNutritionDashboard(session.user.id, date);
    console.log("[api/nutrition/dashboard] ok", Date.now() - started, "ms");
    return jsonOk(dashboard);
  } catch (e) {
    console.error("[api/nutrition/dashboard]", e);
    const { createEmptyNutritionDashboard } = await import("@/lib/nutrition-defaults");
    return jsonOk(createEmptyNutritionDashboard(startOfDay(new Date())));
  }
}
