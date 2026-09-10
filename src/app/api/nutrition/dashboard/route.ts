import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { jsonOk, jsonError } from "@/lib/api-response";
import { loadNutritionDashboard } from "@/lib/nutrition-service";
import { resolveNutritionDay } from "@/lib/nutrition-day";
import { createEmptyNutritionDashboard } from "@/lib/nutrition-defaults";

export async function GET(req: NextRequest) {
  const started = Date.now();
  try {
    const session = await auth();
    if (!session?.user?.id) return jsonError("Nicht angemeldet", 401);
    const q = req.nextUrl.searchParams;
    const resolved = resolveNutritionDay({
      day: q.get("day"),
      date: q.get("date"),
      tzOffset: q.get("tzOffset"),
    });
    const dashboard = await loadNutritionDashboard(session.user.id, resolved.date, {
      from: resolved.rangeFrom,
      to: resolved.rangeTo,
    });
    console.log("[api/nutrition/dashboard] ok", Date.now() - started, "ms");
    return jsonOk(dashboard);
  } catch (e) {
    console.error("[api/nutrition/dashboard]", e);
    return jsonOk(createEmptyNutritionDashboard());
  }
}
