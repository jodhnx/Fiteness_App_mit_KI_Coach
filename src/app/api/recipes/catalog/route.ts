import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { jsonOk, jsonError, handleApiError } from "@/lib/api-response";
import { getFitnessRecipe } from "@/data/fitness-recipes";
import { queryRecipeCatalog, getCatalogStats } from "@/lib/recipes/catalog-query";
import { tableExists } from "@/lib/prisma-safe";

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) return jsonError("Nicht angemeldet", 401);

    const sp = req.nextUrl.searchParams;
    const q = sp.get("q") ?? undefined;
    const page = Number(sp.get("page") ?? "1") || 1;
    const limit = Number(sp.get("limit") ?? "24") || 24;
    const filters = sp.getAll("filter").filter(Boolean);
    // Support comma-separated filters too
    const filterCsv = sp.get("filters");
    if (filterCsv) {
      for (const f of filterCsv.split(",")) {
        const t = f.trim();
        if (t) filters.push(t);
      }
    }

    let favoriteIds: string[] = [];
    if (await tableExists("RecipeCatalogFavorite")) {
      const favs = await prisma.recipeCatalogFavorite.findMany({
        where: { userId: session.user.id },
        select: { recipeId: true },
        orderBy: { createdAt: "desc" },
        take: 100,
      });
      favoriteIds = favs.map((f) => f.recipeId);
    }

    const result = queryRecipeCatalog({ q, filters, page, limit });
    const stats = getCatalogStats();

    return jsonOk({
      ...result,
      favoriteIds,
      catalogTotal: stats.total,
    });
  } catch (e) {
    return handleApiError(e);
  }
}

/** Toggle favorite for a catalog recipe. */
export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) return jsonError("Nicht angemeldet", 401);

    if (!(await tableExists("RecipeCatalogFavorite"))) {
      return jsonError(
        'Tabelle „RecipeCatalogFavorite“ fehlt. Bitte: npx prisma db push',
        503
      );
    }

    const body = await req.json().catch(() => ({}));
    const recipeId = typeof body.recipeId === "string" ? body.recipeId : "";
    if (!getFitnessRecipe(recipeId)) return jsonError("Rezept nicht gefunden", 404);

    const existing = await prisma.recipeCatalogFavorite.findUnique({
      where: {
        userId_recipeId: { userId: session.user.id, recipeId },
      },
    });

    if (existing) {
      await prisma.recipeCatalogFavorite.delete({ where: { id: existing.id } });
      return jsonOk({ favorited: false, recipeId });
    }

    await prisma.recipeCatalogFavorite.create({
      data: { userId: session.user.id, recipeId },
    });
    return jsonOk({ favorited: true, recipeId });
  } catch (e) {
    return handleApiError(e);
  }
}
