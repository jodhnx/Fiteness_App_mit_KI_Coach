import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { jsonOk, jsonError, handleApiError } from "@/lib/api-response";
import { getFitnessRecipe, FITNESS_RECIPES } from "@/data/fitness-recipes";
import { tableExists } from "@/lib/prisma-safe";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) return jsonError("Nicht angemeldet", 401);

    let favoriteIds: string[] = [];
    if (await tableExists("RecipeCatalogFavorite")) {
      const favs = await prisma.recipeCatalogFavorite.findMany({
        where: { userId: session.user.id },
        select: { recipeId: true },
        orderBy: { createdAt: "desc" },
      });
      favoriteIds = favs.map((f) => f.recipeId);
    }

    return jsonOk({
      recipes: FITNESS_RECIPES.map((r) => ({
        id: r.id,
        name: r.name,
        mealSlot: r.mealSlot,
        tags: r.tags,
        prepMinutes: r.prepMinutes,
        calories: r.calories,
        proteinG: r.proteinG,
        carbsG: r.carbsG,
        fatG: r.fatG,
        fiberG: r.fiberG ?? null,
        emoji: r.emoji,
        accent: r.accent,
      })),
      favoriteIds,
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
