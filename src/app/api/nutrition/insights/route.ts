import { auth } from "@/lib/auth";
import { jsonOk, jsonError, handleApiError } from "@/lib/api-response";
import { loadNutritionInsights } from "@/lib/nutrition-service";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) return jsonError("Nicht angemeldet", 401);
    const insights = await loadNutritionInsights(session.user.id);
    return jsonOk(insights);
  } catch (e) {
    return handleApiError(e);
  }
}
