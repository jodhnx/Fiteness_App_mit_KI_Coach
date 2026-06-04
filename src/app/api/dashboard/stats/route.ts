import { unstable_cache } from "next/cache";
import { auth } from "@/lib/auth";
import { loadDashboardStats } from "@/lib/dashboard-data";
import { jsonOk, jsonError, handleApiError } from "@/lib/api-response";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) return jsonError("Nicht angemeldet", 401);

    const userId = session.user.id;
    const getStats = unstable_cache(
      async () => loadDashboardStats(userId),
      [`dashboard-stats-v2-${userId}`],
      { revalidate: 30, tags: [`dashboard-${userId}`] }
    );

    const stats = await getStats();
    const res = jsonOk(stats);
    res.headers.set("Cache-Control", "private, max-age=30, stale-while-revalidate=60");
    return res;
  } catch (e) {
    return handleApiError(e);
  }
}
