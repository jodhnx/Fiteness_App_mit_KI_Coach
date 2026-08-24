import { NextRequest } from "next/server";
import { unstable_cache } from "next/cache";
import { auth } from "@/lib/auth";
import { loadHomeData, loadHomeEnrichment } from "@/lib/home-data";
import { createEmptyHomeData, isValidHomePayload } from "@/lib/home-defaults";
import { jsonOk, jsonError } from "@/lib/api-response";

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return jsonError("Nicht angemeldet", 401);
    }

    const userId = session.user.id;
    const enrichOnly = req.nextUrl.searchParams.get("enrich") === "1";

    if (enrichOnly) {
      const extras = await loadHomeEnrichment(userId);
      const res = jsonOk(extras);
      res.headers.set("Cache-Control", "private, max-age=20, stale-while-revalidate=40");
      return res;
    }

    const getHome = unstable_cache(
      async () => loadHomeData(userId),
      [`home-data-v3-${userId}`],
      { revalidate: 90, tags: [`home-${userId}`] }
    );

    let data = await getHome();

    if (!isValidHomePayload(data)) {
      console.error("[api/home] invalid payload, using defaults", data);
      data = createEmptyHomeData();
    }

    const res = jsonOk(data);
    res.headers.set("Cache-Control", "private, max-age=25, stale-while-revalidate=50");
    return res;
  } catch (e) {
    console.error("[api/home] error", e);
    const fallback = createEmptyHomeData();
    const res = jsonOk({ ...fallback, _fallback: true });
    res.headers.set("Cache-Control", "private, no-cache");
    return res;
  }
}
