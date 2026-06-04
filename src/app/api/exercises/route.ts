import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { jsonOk, jsonError, handleApiError } from "@/lib/api-response";
import type { EquipmentType, MuscleGroup } from "@prisma/client";

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) return jsonError("Nicht angemeldet", 401);

    const q = req.nextUrl.searchParams.get("q") ?? "";
    const muscle = req.nextUrl.searchParams.get("muscle") as MuscleGroup | null;
    const equipment = req.nextUrl.searchParams.get("equipment");
    const difficulty = req.nextUrl.searchParams.get("difficulty");
    const favorites = req.nextUrl.searchParams.get("favorites") === "1";
    const sort = req.nextUrl.searchParams.get("sort") ?? "name";
    const take = Math.min(Number(req.nextUrl.searchParams.get("limit") ?? 50), 200);

    if (favorites) {
      const favs = await prisma.favoriteExercise.findMany({
        where: { userId: session.user.id },
        include: { exercise: true },
        orderBy: { createdAt: "desc" },
      });
      return jsonOk({ exercises: favs.map((f) => f.exercise) });
    }

    const exercises = await prisma.exerciseLibrary.findMany({
      where: {
        AND: [
          muscle ? { muscleGroup: muscle } : {},
          equipment ? { equipment: equipment as EquipmentType } : {},
          difficulty ? { difficulty: difficulty as "BEGINNER" | "INTERMEDIATE" | "ADVANCED" } : {},
          q
            ? {
                OR: [
                  { name: { contains: q, mode: "insensitive" } },
                  { slug: { contains: q, mode: "insensitive" } },
                ],
              }
            : {},
        ],
      },
      select: {
        id: true,
        slug: true,
        name: true,
        muscleGroup: true,
        difficulty: true,
        description: true,
        instructions: true,
        imageUrl: true,
        equipment: true,
        primaryMuscles: true,
        secondaryMuscles: true,
        isCompound: true,
        usageCount: true,
      },
      orderBy: sort === "popularity" ? { usageCount: "desc" } : { name: "asc" },
      take,
    });

    const ids = exercises.map((e) => e.id);
    const ratings = await prisma.exerciseRating.groupBy({
      by: ["exerciseLibraryId"],
      where: { exerciseLibraryId: { in: ids } },
      _avg: { rating: true },
      _count: true,
    });
    const ratingMap = new Map(
      ratings.map((r) => [r.exerciseLibraryId, { avg: r._avg.rating, count: r._count }])
    );
    const favSet = new Set(
      (
        await prisma.favoriteExercise.findMany({
          where: { userId: session.user.id, exerciseLibraryId: { in: ids } },
          select: { exerciseLibraryId: true },
        })
      ).map((f) => f.exerciseLibraryId)
    );

    const enriched = exercises.map((ex) => ({
      ...ex,
      ratingAvg: ratingMap.get(ex.id)?.avg ?? null,
      ratingCount: ratingMap.get(ex.id)?.count ?? 0,
      popularity: ex.usageCount,
      isFavorite: favSet.has(ex.id),
    }));

    return jsonOk({ exercises: enriched, total: enriched.length });
  } catch (e) {
    return handleApiError(e);
  }
}
