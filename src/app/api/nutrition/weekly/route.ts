import { auth } from "@/lib/auth";
import { jsonOk, jsonError, handleApiError } from "@/lib/api-response";
import { loadWeeklyNutrition } from "@/lib/nutrition-service";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) return jsonError("Nicht angemeldet", 401);
    const weekly = await loadWeeklyNutrition(session.user.id);
    return jsonOk(weekly);
  } catch (e) {
    return handleApiError(e);
  }
}
