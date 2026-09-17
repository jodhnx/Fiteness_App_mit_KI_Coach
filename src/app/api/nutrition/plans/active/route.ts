import { auth } from "@/lib/auth";
import { jsonOk, jsonError, handleApiError } from "@/lib/api-response";
import { getActivePlanSummary } from "@/lib/nutrition-plans";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) return jsonError("Nicht angemeldet", 401);
    const active = await getActivePlanSummary(session.user.id);
    return jsonOk({ active });
  } catch (e) {
    return handleApiError(e);
  }
}
