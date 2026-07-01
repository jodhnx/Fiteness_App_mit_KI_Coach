import { auth } from "@/lib/auth";
import { jsonOk, jsonError, handleApiError } from "@/lib/api-response";
import { loadExtendedHealthDashboard } from "@/lib/health/health-dashboard";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) return jsonError("Nicht angemeldet", 401);
    const dashboard = await loadExtendedHealthDashboard(session.user.id);
    return jsonOk(dashboard);
  } catch (e) {
    return handleApiError(e);
  }
}
