import { prisma } from "@/lib/prisma";
import { buildGymCheckInStats } from "@/lib/gym-checkin";
import { sessionDurationSec, setVolume } from "@/lib/workout-metrics";
import { subDays } from "date-fns";

export type JourneySession = {
  id: string;
  name: string;
  completedAt: string;
  durationMin: number;
  volumeKg: number;
  exerciseCount: number;
};

export type WorkoutJourney = {
  streak: { currentDays: number; longestDays: number };
  checkIn: Awaited<ReturnType<typeof buildGymCheckInStats>>;
  recentSessions: JourneySession[];
  stats30d: {
    sessions: number;
    totalDurationMin: number;
    totalVolumeKg: number;
    gymVisits: number;
  };
};

export async function buildWorkoutJourney(userId: string): Promise<WorkoutJourney> {
  const since30 = subDays(new Date(), 30);

  const [sessions30, recentRaw, streak, checkIn] = await Promise.all([
    prisma.workoutSession.findMany({
      where: {
        userId,
        status: "COMPLETED",
        completedAt: { gte: since30 },
      },
      include: { sets: true },
      orderBy: { completedAt: "desc" },
    }),
    prisma.workoutSession.findMany({
      where: { userId, status: "COMPLETED" },
      include: { sets: true },
      orderBy: { completedAt: "desc" },
      take: 8,
    }),
    prisma.trainingStreak.findUnique({ where: { userId } }),
    buildGymCheckInStats(userId),
  ]);

  let totalDurationMin = 0;
  let totalVolumeKg = 0;
  for (const s of sessions30) {
    totalDurationMin += Math.round(
      sessionDurationSec(s.startedAt, s.completedAt) / 60
    );
    for (const set of s.sets) {
      totalVolumeKg += setVolume(set.reps, set.weightKg);
    }
  }

  const recentSessions: JourneySession[] = recentRaw.map((s) => {
    const names = new Set(s.sets.map((set) => set.exerciseName));
    let vol = 0;
    for (const set of s.sets) vol += setVolume(set.reps, set.weightKg);
    return {
      id: s.id,
      name: s.name,
      completedAt: (s.completedAt ?? s.startedAt).toISOString(),
      durationMin: Math.round(sessionDurationSec(s.startedAt, s.completedAt) / 60),
      volumeKg: Math.round(vol),
      exerciseCount: names.size,
    };
  });

  return {
    streak: {
      currentDays: streak?.currentDays ?? checkIn.currentStreak,
      longestDays: streak?.longestDays ?? checkIn.longestStreak,
    },
    checkIn,
    recentSessions,
    stats30d: {
      sessions: sessions30.length,
      totalDurationMin,
      totalVolumeKg: Math.round(totalVolumeKg),
      gymVisits: checkIn.daysThisMonth,
    },
  };
}
