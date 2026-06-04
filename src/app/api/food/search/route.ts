import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { jsonOk, jsonError, handleApiError } from "@/lib/api-response";
import { searchFoodProducts } from "@/lib/food/nutrition-search-service";
import { searchLocalFoods } from "@/lib/food/food-database-service";

export async function GET(req: NextRequest) {
  const started = Date.now();
  const q = req.nextUrl.searchParams.get("q") ?? "";
  const url = req.nextUrl.toString();

  try {
    const session = await auth();
    if (!session?.user?.id) return jsonError("Nicht angemeldet", 401);

    const suggestions = req.nextUrl.searchParams.get("suggestions") !== "0";

    const result = await searchFoodProducts(session.user.id, q.trim(), {
      suggestions,
      recordHistory: q.trim().length >= 2,
    });

    console.log("[api/food/search] OK", {
      url,
      query: q,
      ms: Date.now() - started,
      products: result.products.length,
      offSource: result.offSource,
      offError: result.offError,
    });

    return jsonOk(result);
  } catch (e) {
    console.error("[api/food/search] FAILED", {
      url,
      query: q,
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

    const message =
      e instanceof Error ? e.message : "Suche vorübergehend nicht verfügbar";

    return jsonOk({
      products: localFallback,
      suggestions: [],
      query: q.trim(),
      source: "local" as const,
      offAvailable: false,
      offError: `${message} — nur lokale Datenbank (${localFallback.length} Treffer).`,
      localCount: localFallback.length,
      offCount: 0,
      localError: message,
    });
  }
}
