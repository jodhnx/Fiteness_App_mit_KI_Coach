import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { setVolume } from "@/lib/workout-metrics";
import { analyzeTrainingWarnings } from "@/lib/plan-science-engine";
import { buildGymCheckInStats } from "@/lib/gym-checkin";
import { jsonOk, jsonError, handleApiError } from "@/lib/api-response";
import { subDays, format } from "date-fns";
import { de } from "date-fns/locale";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) return jsonError("Nicht angemeldet", 401);

    const [sessions, trainingStreak, checkIn] = await Promise.all([
      prisma.workoutSession.findMany({
        where: {
          userId: session.user.id,
          status: "COMPLETED",
          completedAt: { gte: subDays(new Date(), 90) },
        },
        include: { sets: true },
        orderBy: { completedAt: "asc" },
      }),
      prisma.trainingStreak.findUnique({
        where: { userId: session.user.id },
      }),
      buildGymCheckInStats(session.user.id),
    ]);

    const volumeByDay = Array.from({ length: 30 }, (_, i) => {
      const d = subDays(new Date(), 29 - i);
      const daySessions = sessions.filter(
        (s) =>
          s.completedAt &&
          format(s.completedAt, "yyyy-MM-dd") === format(d, "yyyy-MM-dd")
      );
      let vol = 0;
      for (const s of daySessions) {
        for (const set of s.sets) {
          vol += setVolume(set.reps, set.weightKg);
        }
      }
      return { label: format(d, "EEE", { locale: de }), value: Math.round(vol) };
    });

    const weightPRs = await prisma.personalRecord.findMany({
      where: { userId: session.user.id, recordType: "MAX_WEIGHT" },
      include: { exercise: true },
      orderBy: { achievedAt: "asc" },
      take: 20,
    });

    const setsPerWeek = Array.from({ length: 8 }, (_, i) => {
      const weekStart = subDays(new Date(), (7 - i) * 7);
      const weekEnd = subDays(new Date(), (6 - i) * 7);
      let sets = 0;
      let reps = 0;
      for (const s of sessions) {
        if (!s.completedAt || s.completedAt < weekStart || s.completedAt >= weekEnd) continue;
        for (const set of s.sets) {
          if (set.completed) {
            sets++;
            reps += set.reps ?? 0;
          }
        }
      }
      return {
        label: format(weekStart, "dd.MM", { locale: de }),
        sets,
        reps,
      };
    });

    const muscleVolume: Record<string, number> = {};
    const exerciseIds = [
      ...new Set(sessions.flatMap((s) => s.sets.map((set) => set.exerciseLibraryId).filter(Boolean))),
    ] as string[];
    const exList = await prisma.exerciseLibrary.findMany({
      where: { id: { in: exerciseIds } },
      select: { id: true, muscleGroup: true },
    });
    const mgMap = new Map(exList.map((e) => [e.id, e.muscleGroup]));
    for (const s of sessions) {
      for (const set of s.sets) {
        if (!set.exerciseLibraryId) continue;
        const mg = mgMap.get(set.exerciseLibraryId);
        if (mg) muscleVolume[mg] = (muscleVolume[mg] ?? 0) + setVolume(set.reps, set.weightKg);
      }
    }

    const lastPR = await prisma.personalRecord.findFirst({
      where: { userId: session.user.id },
      orderBy: { achievedAt: "desc" },
    });
    const weeksSincePR = lastPR
      ? Math.floor((Date.now() - lastPR.achievedAt.getTime()) / 604800000)
      : 8;

    const weeklyVolumes = Array.from({ length: 8 }, (_, i) => {
      const weekStart = subDays(new Date(), (7 - i) * 7);
      const weekEnd = subDays(new Date(), (6 - i) * 7);
      let vol = 0;
      let sess = 0;
      for (const s of sessions) {
        if (!s.completedAt || s.completedAt < weekStart || s.completedAt >= weekEnd) continue;
        sess++;
        for (const set of s.sets) vol += setVolume(set.reps, set.weightKg);
      }
      return { vol: Math.round(vol), sess };
    });

    const warnings = analyzeTrainingWarnings({
      weeklyVolume: weeklyVolumes.map((w) => w.vol),
      sessionsPerWeek: weeklyVolumes.map((w) => w.sess),
      muscleVolume,
      weeksSincePR,
    });

    return jsonOk({
      volumeByDay,
      setsPerWeek: setsPerWeek.map((w) => ({ label: w.label, value: w.sets })),
      repsPerWeek: setsPerWeek.map((w) => ({ label: w.label, value: w.reps })),
      muscleHeatmap: Object.entries(muscleVolume)
        .map(([muscle, volume]) => ({ muscle, volume: Math.round(volume) }))
        .sort((a, b) => b.volume - a.volume),
      warnings,
      weightPRs,
      trainingStreak,
      checkIn,
      sessionsLast30: sessions.filter(
        (s) => s.completedAt && s.completedAt >= subDays(new Date(), 30)
      ).length,
    });
  } catch (e) {
    return handleApiError(e);
  }
}
