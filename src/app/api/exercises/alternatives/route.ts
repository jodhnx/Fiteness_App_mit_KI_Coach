import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { chatCompletion } from "@/lib/openai";
import {
  buildAlternativesPrompt,
  getExerciseAlternatives,
} from "@/lib/exercise-alternatives";
import { jsonOk, jsonError, handleApiError } from "@/lib/api-response";

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) return jsonError("Nicht angemeldet", 401);
    const id = req.nextUrl.searchParams.get("exerciseLibraryId");
    if (!id) return jsonError("exerciseLibraryId fehlt");

    const alternatives = await getExerciseAlternatives(id);
    const ratings = await prisma.exerciseRating.groupBy({
      by: ["exerciseLibraryId"],
      where: { exerciseLibraryId: { in: alternatives.map((a) => a.id) } },
      _avg: { rating: true },
      _count: true,
    });
    const ratingMap = new Map(
      ratings.map((r) => [r.exerciseLibraryId, { avg: r._avg.rating, count: r._count }])
    );

    return jsonOk({
      alternatives: alternatives.map((ex) => ({
        ...ex,
        ratingAvg: ratingMap.get(ex.id)?.avg ?? null,
        ratingCount: ratingMap.get(ex.id)?.count ?? 0,
        popularity: ex.usageCount,
      })),
    });
  } catch (e) {
    return handleApiError(e);
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) return jsonError("Nicht angemeldet", 401);
    const { exerciseLibraryId } = await req.json();
    if (!exerciseLibraryId) return jsonError("exerciseLibraryId fehlt");

    const exercise = await prisma.exerciseLibrary.findUnique({
      where: { id: exerciseLibraryId },
    });
    if (!exercise) return jsonError("Übung nicht gefunden", 404);

    const staticAlts = await getExerciseAlternatives(exerciseLibraryId, 5);
    const candidates = await prisma.exerciseLibrary.findMany({
      where: { muscleGroup: exercise.muscleGroup },
      orderBy: { usageCount: "desc" },
      take: 80,
    });

    let aiSlugs: string[] = [];
    try {
      const { content } = await chatCompletion(
        [
          {
            role: "system",
            content:
              "Du bist ein Strength-Coach. Antworte nur mit 5 Übungs-Slugs aus der Liste, kommagetrennt, keine Erklärung.",
          },
          {
            role: "user",
            content: buildAlternativesPrompt(
              exercise.name,
              exercise.muscleGroup,
              exercise.equipment,
              candidates.map((c) => c.slug)
            ),
          },
        ],
        session.user.id
      );
      aiSlugs = content
        .split(/[,\n]/)
        .map((s) => s.trim().toLowerCase())
        .filter(Boolean)
        .slice(0, 5);
    } catch {
      /* fallback to static */
    }

    const aiExercises =
      aiSlugs.length > 0
        ? await prisma.exerciseLibrary.findMany({ where: { slug: { in: aiSlugs } } })
        : [];

    const merged = [...aiExercises];
    for (const s of staticAlts) {
      if (!merged.find((m) => m.id === s.id)) merged.push(s);
    }

    return jsonOk({ alternatives: merged.slice(0, 8), aiUsed: aiExercises.length > 0 });
  } catch (e) {
    return handleApiError(e);
  }
}
