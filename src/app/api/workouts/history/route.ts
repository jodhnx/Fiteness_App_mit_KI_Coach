import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { setVolume } from "@/lib/workout-metrics";
import { analyzeTrainingWarnings } from "@/lib/plan-science-engine";
import { jsonOk, jsonError, handleApiError } from "@/lib/api-response";
import { subWeeks, format, parseISO, startOfDay, endOfDay } from "date-fns";
import { de } from "date-fns/locale";

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) return jsonError("Nicht angemeldet", 401);

    const q = req.nextUrl.searchParams.get("q") ?? "";
    const from = req.nextUrl.searchParams.get("from");
    const to = req.nextUrl.searchParams.get("to");
    const take = Math.min(Number(req.nextUrl.searchParams.get("limit") ?? 100), 200);

    const sessions = await prisma.workoutSession.findMany({
      where: {
        userId: session.user.id,
        status: "COMPLETED",
        ...(from || to
          ? {
              completedAt: {
                ...(from ? { gte: startOfDay(parseISO(from)) } : {}),
                ...(to ? { lte: endOfDay(parseISO(to)) } : {}),
              },
            }
          : {}),
        ...(q
          ? { name: { contains: q, mode: "insensitive" as const } }
          : {}),
      },
      include: { sets: true, plan: true, day: true },
      orderBy: { completedAt: "desc" },
      take,
    });

    const exerciseIds = [
      ...new Set(
        sessions.flatMap((s) => s.sets.map((set) => set.exerciseLibraryId).filter(Boolean))
      ),
    ] as string[];
    const exercises = await prisma.exerciseLibrary.findMany({
      where: { id: { in: exerciseIds } },
      select: { id: true, muscleGroup: true },
    });
    const muscleById = new Map(exercises.map((e) => [e.id, e.muscleGroup]));

    const muscleVolume: Record<string, number> = {};
    for (const s of sessions) {
      for (const set of s.sets) {
        if (!set.exerciseLibraryId) continue;
        const mg = muscleById.get(set.exerciseLibraryId);
        if (mg) {
          muscleVolume[mg] =
            (muscleVolume[mg] ?? 0) + setVolume(set.reps, set.weightKg);
        }
      }
    }

    const weekCharts = Array.from({ length: 8 }, (_, i) => {
      const weekStart = subWeeks(new Date(), 7 - i);
      const weekEnd = subWeeks(new Date(), 6 - i);
      const weekSessions = sessions.filter(
        (s) =>
          s.completedAt &&
          s.completedAt >= weekStart &&
          s.completedAt < weekEnd
      );
      let vol = 0;
      let sets = 0;
      let reps = 0;
      for (const s of weekSessions) {
        for (const set of s.sets) {
          vol += setVolume(set.reps, set.weightKg);
          sets += 1;
          reps += set.reps ?? 0;
        }
      }
      return {
        label: format(weekStart, "dd.MM", { locale: de }),
        volume: Math.round(vol),
        sets,
        reps,
        sessions: weekSessions.length,
      };
    });

    const lastPR = await prisma.personalRecord.findFirst({
      where: { userId: session.user.id },
      orderBy: { achievedAt: "desc" },
    });
    const weeksSincePR = lastPR
      ? Math.floor((Date.now() - lastPR.achievedAt.getTime()) / 604800000)
      : 8;

    const warnings = analyzeTrainingWarnings({
      weeklyVolume: weekCharts.map((w) => w.volume),
      sessionsPerWeek: weekCharts.map((w) => w.sessions),
      muscleVolume,
      weeksSincePR,
    });

    return jsonOk({
      sessions,
      muscleVolume,
      muscleHeatmap: Object.entries(muscleVolume)
        .map(([muscle, volume]) => ({ muscle, volume: Math.round(volume) }))
        .sort((a, b) => b.volume - a.volume),
      weekCharts,
      warnings,
      totalSessions: sessions.length,
      totalDurationMin: Math.round(
        sessions.reduce((a, s) => a + (s.durationSec ?? 0), 0) / 60
      ),
    });
  } catch (e) {
    return handleApiError(e);
  }
}
