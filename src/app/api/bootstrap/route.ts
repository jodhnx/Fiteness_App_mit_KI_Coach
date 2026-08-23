import { auth } from "@/lib/auth";
import { jsonOk, jsonError } from "@/lib/api-response";
import { loadHomeCriticalData } from "@/lib/home-critical";
import { profileStubFromBoot } from "@/lib/app-init";
import { createEmptyNutritionDashboard } from "@/lib/nutrition-defaults";

/**
 * Boot payload: ONLY Home + Nutrition (+ profile stub from same query).
 * Progress / community / recipes must NOT block cold start —
 * they warm in the background after Home is shown.
 */
export async function GET() {
  const started = Date.now();
  try {
    const session = await auth();
    if (!session?.user?.id) return jsonError("Nicht angemeldet", 401);
    const userId = session.user.id;

    const home = await loadHomeCriticalData(userId);
    const nutrition = home.nutrition ?? createEmptyNutritionDashboard();
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
