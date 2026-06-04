import { auth } from "@/lib/auth";
import { jsonOk, jsonError, handleApiError } from "@/lib/api-response";
import { loadNutritionDashboard } from "@/lib/nutrition-service";
import { buildNutritionCoachTipsWithWater } from "@/lib/nutrition-coach";
import { startOfDay } from "date-fns";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) return jsonError("Nicht angemeldet", 401);
    const dashboard = await loadNutritionDashboard(
      session.user.id,
      startOfDay(new Date())
    );
    const tips = buildNutritionCoachTipsWithWater(
      dashboard.consumed,
      dashboard.targets,
      dashboard.targets.nutritionGoal,
      dashboard.water.consumedMl,
      dashboard.water.targetMl
    );
    return jsonOk({
      tips,
      consumed: dashboard.consumed,
      targets: dashboard.targets,
      summary: tips[0]?.message ?? "Tracke deine Mahlzeiten für personalisierte Tipps.",
    });
  } catch (e) {
    console.error("[api/nutrition/coach]", e);
    return jsonOk({
      tips: [
        {
          type: "info",
          message: "Tracke Mahlzeiten für personalisierte KI-Tipps.",
          priority: "low",
        },
      ],
      summary: "Keine Ernährungsdaten vorhanden",
      consumed: { calories: 0, proteinG: 0, carbsG: 0, fatG: 0 },
      targets: { calories: 0, proteinG: 0, carbsG: 0, fatG: 0 },
    });
  }
}
