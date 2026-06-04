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

  const muscleLastHit: Record<string, Date> = {};
  const muscleVolume7d: Record<string, number> = {};

  for (const s of sessions) {
    for (const set of s.sets) {
      if (!set.completed || !set.exercise) continue;
      const mg = set.exercise.muscleGroup;
      const vol = setVolume(set.reps, set.weightKg);
      const intensityFactor = set.rpe && set.rpe >= 8 ? 1.15 : 1;
      muscleVolume7d[mg] = (muscleVolume7d[mg] ?? 0) + vol * intensityFactor;
      const completedAt = s.completedAt ?? new Date();
      if (!muscleLastHit[mg] || completedAt > muscleLastHit[mg]) {
        muscleLastHit[mg] = completedAt;
      }
    }
  }

  const now = Date.now();
  const muscles: MuscleRecovery[] = Object.keys(RECOVERY_HOURS).map((muscle) => {
    const last = muscleLastHit[muscle];
    const hoursNeeded = RECOVERY_HOURS[muscle];
    const volume = muscleVolume7d[muscle] ?? 0;
    let recoveryPercent = 100;
    let status: MuscleRecovery["status"] = "ready";

    if (last) {
      const hoursSince = (now - last.getTime()) / 3600000;
      const volumePenalty = Math.min(0.35, volume / 120000);
      const effectiveHours = hoursSince * (1 - volumePenalty);
      recoveryPercent = Math.min(100, Math.round((effectiveHours / hoursNeeded) * 100));
      if (recoveryPercent < 50) status = "fatigued";
      else if (recoveryPercent < 100) status = "recovering";
    }

    return {
      muscle,
      label: MUSCLE_LABELS[muscle] ?? muscle,
      recoveryPercent,
      status,
      volume7d: Math.round(volume),
      lastTrainedAt: last?.toISOString() ?? null,
    };
  });

  const avgVolume =
    Object.values(muscleVolume7d).reduce((a, b) => a + b, 0) /
    Math.max(1, Object.keys(muscleVolume7d).length);
  const deloadRecommended = sessions.length >= 4 && avgVolume > 50000;

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
