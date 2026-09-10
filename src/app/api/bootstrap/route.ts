import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { jsonOk, jsonError } from "@/lib/api-response";
import { loadHomeCriticalData } from "@/lib/home-critical";
import { profileStubFromBoot } from "@/lib/app-init";
import { createEmptyNutritionDashboard } from "@/lib/nutrition-defaults";
import { resolveNutritionDay } from "@/lib/nutrition-day";

/**
 * Boot payload: ONLY Home + Nutrition (+ profile stub from same query).
 * Progress / community / recipes must NOT block cold start —
 * they warm in the background after Home is shown.
 *
 * `day` + `tzOffset` select the user's local calendar day (not Vercel UTC).
 */
export async function GET(req: NextRequest) {
  const started = Date.now();
  try {
    const session = await auth();
    if (!session?.user?.id) return jsonError("Nicht angemeldet", 401);
    const userId = session.user.id;
    const q = req.nextUrl.searchParams;
    const resolved = resolveNutritionDay({
      day: q.get("day"),
      date: q.get("date"),
      tzOffset: q.get("tzOffset"),
    });

    const home = await loadHomeCriticalData(userId, resolved.date, {
      from: resolved.rangeFrom,
      to: resolved.rangeTo,
    });
    const nutrition = home.nutrition ?? createEmptyNutritionDashboard(resolved.date);
    const profile = profileStubFromBoot(home, nutrition);

    if (process.env.NODE_ENV === "development") {
      console.info("[api/bootstrap] ok", Date.now() - started, "ms");
    }

    const res = jsonOk({
      home,
      nutrition,
      profile,
      progress: null,
    });
    res.headers.set("Cache-Control", "private, no-cache");
    return res;
  } catch (e) {
    console.error("[api/bootstrap]", e);
    return jsonError("Bootstrap fehlgeschlagen", 500);
  }
}
