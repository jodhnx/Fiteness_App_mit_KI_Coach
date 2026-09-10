import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { jsonOk, jsonError } from "@/lib/api-response";
import { searchFoodProducts } from "@/lib/food/nutrition-search-service";
import { searchLocalFoods } from "@/lib/food/food-database-service";
import { formatApiErrorMessage } from "@/lib/format-api-error";

export async function GET(req: NextRequest) {
  const started = Date.now();
  const q = req.nextUrl.searchParams.get("q") ?? "";

  try {
    const session = await auth();
    if (!session?.user?.id) return jsonError("Nicht angemeldet", 401);

    const enrich = req.nextUrl.searchParams.get("enrich") === "1";
    const localOnly = !enrich;
    const countryParam = req.nextUrl.searchParams.get("country");
    const countryCode =
      countryParam === "AT" || countryParam === "DE" ? countryParam : undefined;

    const result = await searchFoodProducts(session.user.id, q.trim(), {
      suggestions: false,
      recordHistory: q.trim().length >= 3 && enrich,
      localOnly,
      enrich,
      countryCode,
    });

    if (process.env.NODE_ENV === "development") {
      console.log("[api/food/search] OK", {
        ms: Date.now() - started,
        products: result.products.length,
        phase: enrich ? "enrich" : "fast",
        offSource: result.offSource,
      });
    }

    return jsonOk(result);
  } catch (e) {
    console.error("[api/food/search] FAILED", {
      ms: Date.now() - started,
      error: e,
    });

    let localFallback: Awaited<ReturnType<typeof searchLocalFoods>> = [];
    try {
      const session = await auth();
      if (session?.user?.id && q.trim().length >= 2) {
        localFallback = await searchLocalFoods(session.user.id, q.trim(), 20);
      }
    } catch (localErr) {
      console.error("[api/food/search] local fallback failed", localErr);
    }

    const safeMessage = formatApiErrorMessage(e);

    return jsonOk({
      products: localFallback,
      suggestions: [],
      query: q.trim(),
      source: "local" as const,
      offAvailable: false,
      offError:
        localFallback.length > 0
          ? "Online-Suche kurz nicht erreichbar — lokale Treffer."
          : "Suche vorübergehend nicht verfügbar. Bitte erneut versuchen.",
      localCount: localFallback.length,
      offCount: 0,
      localError: safeMessage,
    });
  }
}
