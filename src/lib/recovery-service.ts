import { prisma } from "@/lib/prisma";
import { setVolume } from "@/lib/workout-metrics";
import { subDays } from "date-fns";
import {
  MUSCLE_LABELS,
  type MuscleRecovery,
  type RecoverySnapshot,
} from "@/lib/recovery-shared";

export type { MuscleRecovery, RecoverySnapshot } from "@/lib/recovery-shared";
export { MUSCLE_LABELS, getPlanRecoveryMessage } from "@/lib/recovery-shared";

const RECOVERY_HOURS: Record<string, number> = {
  CHEST: 48,
  BACK: 48,
  SHOULDERS: 48,
  BICEPS: 36,
  TRICEPS: 36,
  LEGS: 72,
  ABS: 24,
  FOREARMS: 24,
  CALVES: 36,
  CARDIO: 24,
};

const DASHBOARD_MUSCLES = ["CHEST", "BACK", "LEGS"] as const;

type LastSessionStats = {
  sets: number;
  volume: number;
  intensityFactor: number;
  at: Date;
};

function statusFromPercent(p: number): MuscleRecovery["status"] {
  if (p >= 100) return "ready";
  if (p < 50) return "fatigued";
  return "recovering";
}

export async function loadMuscleRecovery(userId: string): Promise<RecoverySnapshot> {
  const since = subDays(new Date(), 7);
  const sessions = await prisma.workoutSession.findMany({
    where: {
      userId,
      status: "COMPLETED",
      completedAt: { gte: since },
    },
    include: { sets: { include: { exercise: true } } },
    orderBy: { completedAt: "desc" },
  });

  const muscleVolume7d: Record<string, number> = {};
  const muscleLastSession: Record<string, LastSessionStats> = {};

  for (const s of sessions) {
    const completedAt = s.completedAt ?? new Date();
    const perMuscle: Record<string, { sets: number; volume: number; intensity: number }> = {};

    for (const set of s.sets) {
      if (!set.completed || !set.exercise) continue;
      const mg = set.exercise.muscleGroup;
      const vol = setVolume(set.reps, set.weightKg);
      const intensity = set.rpe && set.rpe >= 8 ? 1.2 : set.rpe && set.rpe >= 6 ? 1.05 : 1;
      muscleVolume7d[mg] = (muscleVolume7d[mg] ?? 0) + vol * intensity;

      if (!perMuscle[mg]) perMuscle[mg] = { sets: 0, volume: 0, intensity: 1 };
      perMuscle[mg].sets += 1;
      perMuscle[mg].volume += vol;
      perMuscle[mg].intensity = Math.max(perMuscle[mg].intensity, intensity);
    }

    for (const [mg, stats] of Object.entries(perMuscle)) {
      if (!muscleLastSession[mg]) {
        muscleLastSession[mg] = {
          sets: stats.sets,
          volume: stats.volume,
          intensityFactor: stats.intensity,
          at: completedAt,
        };
      }
    }
  }

  const muscles: MuscleRecovery[] = Object.keys(RECOVERY_HOURS).map((muscle) => {
    const last = muscleLastSession[muscle];
    const hoursNeeded = RECOVERY_HOURS[muscle];
    const volume = muscleVolume7d[muscle] ?? 0;

    if (!last) {
      return {
        muscle,
        label: MUSCLE_LABELS[muscle] ?? muscle,
        recoveryPercent: 100,
        status: "ready" as const,
        volume7d: Math.round(volume),
        lastTrainedAt: null,
        recoveryHoursRequired: hoursNeeded,
        setsLastSession: 0,
      };
    }

    const setsPenalty = Math.min(0.45, last.sets / 18);
    const volumePenalty = Math.min(0.45, last.volume / 12_000);
    const recoveryHoursRequired =
      hoursNeeded * (1 + setsPenalty + volumePenalty) * last.intensityFactor;

    const hoursSince = (Date.now() - last.at.getTime()) / 3_600_000;
    const recoveryPercent = Math.min(
      100,
      Math.max(0, Math.round((hoursSince / recoveryHoursRequired) * 100))
    );

    return {
      muscle,
      label: MUSCLE_LABELS[muscle] ?? muscle,
      recoveryPercent,
      status: statusFromPercent(recoveryPercent),
      volume7d: Math.round(volume),
      lastTrainedAt: last.at.toISOString(),
      recoveryHoursRequired: Math.round(recoveryHoursRequired * 10) / 10,
      setsLastSession: last.sets,
    };
  });

  const avgVolume =
    Object.values(muscleVolume7d).reduce((a, b) => a + b, 0) /
    Math.max(1, Object.keys(muscleVolume7d).length);
  const deloadRecommended = sessions.length >= 4 && avgVolume > 50_000;

  const highlights = DASHBOARD_MUSCLES.map((m) => {
    const row = muscles.find((r) => r.muscle === m);
    return {
      label: row?.label ?? MUSCLE_LABELS[m],
      recoveryPercent: row?.recoveryPercent ?? 100,
    };
  });

  return {
    muscles,
    deloadRecommended,
    fatigueScore: deloadRecommended ? 72 : 35,
    highlights,
  };
}

