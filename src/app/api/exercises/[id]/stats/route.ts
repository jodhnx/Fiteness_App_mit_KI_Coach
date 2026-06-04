import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { setVolume } from "@/lib/workout-metrics";
import { jsonOk, jsonError, handleApiError } from "@/lib/api-response";
import { subDays, format } from "date-fns";

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  try {
    const session = await auth();
    if (!session?.user?.id) return jsonError("Nicht angemeldet", 401);
    const { id } = await params;

    const exercise = await prisma.exerciseLibrary.findUnique({ where: { id } });
    if (!exercise) return jsonError("Übung nicht gefunden", 404);

    const since = subDays(new Date(), 90);
    const sets = await prisma.workoutSet.findMany({
      where: {
        exerciseLibraryId: id,
        completed: true,
        session: {
          userId: session.user.id,
          status: "COMPLETED",
          completedAt: { gte: since },
        },
      },
      include: { session: true },
      orderBy: { session: { completedAt: "asc" } },
    });

    const sessions = new Set(sets.map((s) => s.workoutSessionId));
    const prs = await prisma.personalRecord.findMany({
      where: { userId: session.user.id, exerciseLibraryId: id },
    });

    const byWeek = new Map<string, { volume: number; maxWeight: number }>();
    for (const set of sets) {
      const wk = format(set.session.completedAt ?? new Date(), "yyyy-'W'ww");
      const cur = byWeek.get(wk) ?? { volume: 0, maxWeight: 0 };
      cur.volume += setVolume(set.reps, set.weightKg);
      cur.maxWeight = Math.max(cur.maxWeight, set.weightKg ?? 0);
      byWeek.set(wk, cur);
    }

    const progressChart = Array.from(byWeek.entries()).map(([label, v]) => ({
      label,
      volume: Math.round(v.volume),
      maxWeight: v.maxWeight,
    }));

    const ratingAgg = await prisma.exerciseRating.aggregate({
      where: { exerciseLibraryId: id },
      _avg: { rating: true },
      _count: true,
    });

    return jsonOk({
      exercise,
      frequency: sessions.size,
      totalSets: sets.length,
      bestWeight: prs.find((p) => p.recordType === "MAX_WEIGHT")?.value ?? null,
      bestVolume: prs.find((p) => p.recordType === "MAX_VOLUME")?.value ?? null,
      estimated1RM: prs.find((p) => p.recordType === "ESTIMATED_1RM")?.value ?? null,
      progressChart,
      ratingAvg: ratingAgg._avg.rating,
      ratingCount: ratingAgg._count,
      popularity: exercise.usageCount,
    });
  } catch (e) {
    return handleApiError(e);
  }
}
