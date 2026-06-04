import { unstable_cache } from "next/cache";
import { auth } from "@/lib/auth";
import { loadGamificationHomeCard } from "@/lib/gamification-home";
import { loadGamificationPayload, degradedPayload } from "@/lib/gamification-payload";
import { jsonOk, jsonError } from "@/lib/api-response";

export async function GET(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) return jsonError("Nicht angemeldet", 401);
    const userId = session.user.id;
    const { searchParams } = new URL(req.url);
    const summaryOnly = searchParams.get("summary") === "1";
    const forceRefresh = searchParams.get("refresh") === "1";

    if (summaryOnly) {
      const summary = await unstable_cache(
        () => loadGamificationHomeCard(userId),
        [`gamification-summary-${userId}`],
        { revalidate: 60, tags: [`gamification-${userId}`] }
      )();
      const res = jsonOk({ summary });
      res.headers.set("Cache-Control", "private, max-age=50, stale-while-revalidate=100");
      return res;
    }

    const loadFull = async () =>
      loadGamificationPayload(userId, { runUnlockCheck: forceRefresh });

    const payload = forceRefresh
      ? await loadFull()
      : await unstable_cache(loadFull, [`gamification-payload-${userId}`], {
          revalidate: 90,
          tags: [`gamification-${userId}`],
        })();

    const res = jsonOk(payload);
    res.headers.set("Cache-Control", "private, max-age=60, stale-while-revalidate=120");
    return res;
  } catch (e) {
    console.error("[api/gamification]", e);
    return jsonOk(
      degradedPayload(e instanceof Error ? e.message : "Interner Serverfehler")
    );
  }
}
