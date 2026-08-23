import { auth } from "@/lib/auth";
import { jsonOk, jsonError, handleApiError } from "@/lib/api-response";
import { getRecentSearchQueries } from "@/lib/food/food-database-service";
import { prisma } from "@/lib/prisma";
import { mapDbFoodToProduct } from "@/lib/food/food-database-service";
import { accessibleFoodItemFilter } from "@/lib/food/food-access";
import { safePrisma } from "@/lib/prisma-safe";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) return jsonError("Nicht angemeldet", 401);

    const [searches, favorites, recents] = await Promise.all([
      getRecentSearchQueries(session.user.id, 10),
      safePrisma(
        () =>
          prisma.foodFavorite.findMany({
        where: {
          userId: session.user.id,
          foodItem: accessibleFoodItemFilter(session.user.id),
        },
        orderBy: [{ pinned: "desc" }, { createdAt: "desc" }],
        include: {
          foodItem: {
            select: {
              id: true,
              name: true,
              brand: true,
              category: true,
              calories: true,
              proteinG: true,
              carbsG: true,
              fatG: true,
              fiberG: true,
              servingG: true,
              barcode: true,
              offCode: true,
              imageUrl: true,
              dataSource: true,
            },
          },
        },
        take: 20,
          }),
        [],
        { logLabel: "history.favorites" }
      ),
      safePrisma(
        () =>
          prisma.foodRecent.findMany({
        where: {
          userId: session.user.id,
          foodItem: accessibleFoodItemFilter(session.user.id),
        },
        include: {
          foodItem: {
            select: {
              id: true,
              name: true,
              brand: true,
              category: true,
              calories: true,
              proteinG: true,
              carbsG: true,
              fatG: true,
              fiberG: true,
              servingG: true,
              barcode: true,
              offCode: true,
              imageUrl: true,
              dataSource: true,
            },
          },
        },
        orderBy: [{ useCount: "desc" }, { lastUsedAt: "desc" }],
        take: 20,
          }),
        [],
        { logLabel: "history.recents" }
      ),
    ]);

    const useCountByFoodId = new Map(
      recents.map((r) => [r.foodItem.id, r.useCount])
    );

    const favoritesSorted = [...favorites].sort((a, b) => {
      const ac = useCountByFoodId.get(a.foodItem.id) ?? 0;
      const bc = useCountByFoodId.get(b.foodItem.id) ?? 0;
      if (bc !== ac) return bc - ac;
      if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
      return b.createdAt.getTime() - a.createdAt.getTime();
    });

    return jsonOk({
      recentSearches: searches,
      favorites: favoritesSorted.map((f) => ({
        ...mapDbFoodToProduct(f.foodItem),
        pinned: f.pinned,
        useCount: useCountByFoodId.get(f.foodItem.id) ?? 0,
      })),
      recents: recents.map((r) => ({
        ...mapDbFoodToProduct(r.foodItem),
        useCount: r.useCount,
      })),
      frequent: [...recents]
        .sort((a, b) => b.useCount - a.useCount)
        .slice(0, 10)
        .map((r) => ({
          ...mapDbFoodToProduct(r.foodItem),
          useCount: r.useCount,
        })),
    });
  } catch (e) {
    return handleApiError(e);
  }
}
