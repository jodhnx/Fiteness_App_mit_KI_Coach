import { unstable_cache } from "next/cache";
import { auth } from "@/lib/auth";
import { buildCoachInsights } from "@/lib/coach-insights";
import { jsonOk, jsonError, handleApiError } from "@/lib/api-response";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) return jsonError("Nicht angemeldet", 401);
    const userId = session.user.id;
    const insights = await unstable_cache(
      () => buildCoachInsights(userId),
      [`coach-insights-${userId}`],
      { revalidate: 45 }
    )();
    return jsonOk(insights);
  } catch (e) {
    return handleApiError(e);
  }
}
