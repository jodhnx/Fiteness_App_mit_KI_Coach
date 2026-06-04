import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { jsonOk, jsonError } from "@/lib/api-response";
import { loadNutritionDashboard } from "@/lib/nutrition-service";
import { loadTrainingSnapshot } from "@/lib/training-snapshot";
import { buildCoachInsights } from "@/lib/coach-insights";
import { startOfDay } from "date-fns";
import { createEmptyNutritionDashboard } from "@/lib/nutrition-defaults";

/** Central daily summary: nutrition (macros) + training + coach */
export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) return jsonError("Nicht angemeldet", 401);

    const dateParam = req.nextUrl.searchParams.get("date");
    const date = dateParam ? startOfDay(new Date(dateParam)) : startOfDay(new Date());
    const userId = session.user.id;

    const [nutrition, training, coach] = await Promise.all([
      loadNutritionDashboard(userId, date).catch(() => createEmptyNutritionDashboard()),
      loadTrainingSnapshot(userId).catch(() => null),
      buildCoachInsights(userId).catch(() => ({
        summary: "Tracke Mahlzeiten für personalisierte Tipps.",
        tips: [],
      })),
    ]);

    const res = jsonOk({
      nutrition,
      training,
      coach,
      syncedAt: new Date().toISOString(),
    });
    res.headers.set("Cache-Control", "private, no-cache");
    return res;
  } catch (e) {
    console.error("[api/nutrition/summary]", e);
    return jsonOk({
      nutrition: createEmptyNutritionDashboard(),
      training: null,
      coach: { summary: "", tips: [] },
      syncedAt: new Date().toISOString(),
    });
  }
}
