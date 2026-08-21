import { prisma } from "@/lib/prisma";
import { setVolume } from "@/lib/workout-metrics";
import { subDays } from "date-fns";
import {
  MUSCLE_LABELS,
  RECOVERY_HOURS,
  type MuscleRecovery,
  type RecoverySnapshot,
} from "@/lib/recovery-shared";

export type { MuscleRecovery, RecoverySnapshot } from "@/lib/recovery-shared";
export { MUSCLE_LABELS, getPlanRecoveryMessage } from "@/lib/recovery-shared";

const DASHBOARD_MUSCLES = ["CHEST", "BACK", "LEGS"] as const;

const MUSCLE_ALIASES: Record<string, string> = {
  chest: "CHEST",
  brust: "CHEST",
  pectorals: "CHEST",
  pecs: "CHEST",
  back: "BACK",
  rücken: "BACK",
  rucken: "BACK",
  lats: "BACK",
  shoulders: "SHOULDERS",
  schultern: "SHOULDERS",
  delts: "SHOULDERS",
  biceps: "BICEPS",
  bizeps: "BICEPS",
  triceps: "TRICEPS",
  trizeps: "TRICEPS",
  legs: "LEGS",
  beine: "LEGS",
  quads: "LEGS",
  quadriceps: "LEGS",
  glutes: "LEGS",
  hamstrings: "LEGS",
  abs: "ABS",
  bauch: "ABS",
  core: "ABS",
  forearms: "FOREARMS",
  unterarme: "FOREARMS",
  calves: "CALVES",
  waden: "CALVES",
  cardio: "CARDIO",
};

function normalizeMuscleKey(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const upper = raw.trim().toUpperCase();
  if (RECOVERY_HOURS[upper] != null) return upper;
  const mapped = MUSCLE_ALIASES[raw.trim().toLowerCase()];
  return mapped ?? null;
}

function statusFromPercent(p: number): MuscleRecovery["status"] {
  if (p >= 100) return "ready";
  if (p < 50) return "fatigued";
  return "recovering";
}

/** Recover percent toward 100 over `hoursForFullDeficit` scaled by current deficit. */
function applyRecovery(
  percent: number,
  hoursElapsed: number,
  hoursForFullFromZero: number
): number {
  if (percent >= 100 || hoursElapsed <= 0) return Math.min(100, percent);
  const deficit = 100 - percent;
  const hoursNeeded = hoursForFullFromZero * (deficit / 100);
  if (hoursNeeded <= 0) return 100;
  const gain = deficit * Math.min(1, hoursElapsed / hoursNeeded);
  return Math.min(100, percent + gain);
}

type MuscleHit = {
  at: Date;
  hardSets: number;
  volume: number;
  intensityFactor: number;
  loadFactor: number; // 1 primary, ~0.5 secondary
};

/**
 * Dynamic muscle recovery V2:
 * - Uses primary + secondary muscles from ExerciseLibrary
 * - Stacks multiple sessions (doesn't overwrite Monday with Tuesday)
 * - Hard sets / volume / RPE scale recovery debt
 * - Time recovers toward 100% dynamically (not fixed 24h)
 */
export async function loadMuscleRecovery(userId: string): Promise<RecoverySnapshot> {
  const since = subDays(new Date(), 14);
  const now = new Date();
  const sessions = await prisma.workoutSession.findMany({
    where: {
      userId,
      status: "COMPLETED",
      completedAt: { gte: since },
    },
    include: {
      sets: {
        include: {
          exercise: {
            select: {
              muscleGroup: true,
              primaryMuscles: true,
              secondaryMuscles: true,
            },
          },
        },
      },
    },
    orderBy: { completedAt: "asc" },
  });

  const hitsByMuscle: Record<string, MuscleHit[]> = {};
  const muscleVolume7d: Record<string, number> = {};
  const weekAgo = subDays(now, 7).getTime();

  for (const s of sessions) {
    const completedAt = s.completedAt ?? s.startedAt;
    const perSession: Record<
      string,
      { hardSets: number; volume: number; intensity: number; load: number }
    > = {};

    for (const set of s.sets) {
      if (!set.completed) continue;
      const ex = set.exercise;
      const vol = setVolume(set.reps, set.weightKg);
      const intensity =
        set.rpe && set.rpe >= 8 ? 1.25 : set.rpe && set.rpe >= 6.5 ? 1.1 : 1;
      const hard =
        (set.rpe != null && set.rpe >= 7) ||
        (set.reps != null && set.reps > 0 && (set.weightKg ?? 0) > 0);

      const targets: { muscle: string; load: number }[] = [];
      const primary = normalizeMuscleKey(ex?.muscleGroup ?? null);
      if (primary) targets.push({ muscle: primary, load: 1 });

      for (const p of ex?.primaryMuscles ?? []) {
        const m = normalizeMuscleKey(p);
        if (m && !targets.some((t) => t.muscle === m)) {
          targets.push({ muscle: m, load: 1 });
        }
      }
      for (const sec of ex?.secondaryMuscles ?? []) {
        const m = normalizeMuscleKey(sec);
        if (m && !targets.some((t) => t.muscle === m)) {
          targets.push({ muscle: m, load: 0.5 });
        }
      }

      // Fallback: exercise name heuristics for custom/quick sets without library link
      if (targets.length === 0 && set.exerciseName) {
        const n = set.exerciseName.toLowerCase();
        if (n.includes("curl") || n.includes("bicep") || n.includes("bizeps")) {
          targets.push({ muscle: "BICEPS", load: 1 });
        } else if (n.includes("bench") || n.includes("chest") || n.includes("brust")) {
          targets.push({ muscle: "CHEST", load: 1 });
          targets.push({ muscle: "TRICEPS", load: 0.45 });
          targets.push({ muscle: "SHOULDERS", load: 0.4 });
        } else if (n.includes("squat") || n.includes("leg") || n.includes("bein")) {
          targets.push({ muscle: "LEGS", load: 1 });
        } else if (n.includes("row") || n.includes("pulldown") || n.includes("lat")) {
          targets.push({ muscle: "BACK", load: 1 });
          targets.push({ muscle: "BICEPS", load: 0.45 });
        } else if (n.includes("shoulder") || n.includes("presse") || n.includes("delt")) {
          targets.push({ muscle: "SHOULDERS", load: 1 });
        } else if (n.includes("tricep") || n.includes("trizep") || n.includes("pushdown")) {
          targets.push({ muscle: "TRICEPS", load: 1 });
        }
      }

      for (const t of targets) {
        if (!perSession[t.muscle]) {
          perSession[t.muscle] = { hardSets: 0, volume: 0, intensity: 1, load: t.load };
        }
        const row = perSession[t.muscle]!;
        row.hardSets += hard ? 1 : 0.5;
        row.volume += vol * t.load;
        row.intensity = Math.max(row.intensity, intensity);
        row.load = Math.max(row.load, t.load);

        if (completedAt.getTime() >= weekAgo) {
          muscleVolume7d[t.muscle] =
            (muscleVolume7d[t.muscle] ?? 0) + vol * intensity * t.load;
        }
      }
    }

    for (const [mg, stats] of Object.entries(perSession)) {
      if (!hitsByMuscle[mg]) hitsByMuscle[mg] = [];
      hitsByMuscle[mg].push({
        at: completedAt,
        hardSets: stats.hardSets,
        volume: stats.volume,
        intensityFactor: stats.intensity,
        loadFactor: stats.load,
      });
    }
  }

  const computedAt = now.toISOString();

  const muscles: MuscleRecovery[] = Object.keys(RECOVERY_HOURS).map((muscle) => {
    const baseHours = RECOVERY_HOURS[muscle] ?? 48;
    const hits = hitsByMuscle[muscle] ?? [];
    const volume = muscleVolume7d[muscle] ?? 0;

    if (hits.length === 0) {
      return {
        muscle,
        label: MUSCLE_LABELS[muscle] ?? muscle,
        recoveryPercent: 100,
        status: "ready" as const,
        volume7d: Math.round(volume),
        lastTrainedAt: null,
        recoveryHoursRequired: 0,
        setsLastSession: 0,
        computedAt,
        hoursToFull: 0,
      };
    }

    let percent = 100;
    let lastAt: Date | null = null;
    let lastHoursForFull = baseHours;
    let lastHardSets = 0;

    for (const hit of hits) {
      if (lastAt) {
        const gapH = (hit.at.getTime() - lastAt.getTime()) / 3_600_000;
        percent = applyRecovery(percent, gapH, lastHoursForFull);
      }

      // Stimulus → drop recovery % (harder = bigger drop)
      const setsFactor = Math.min(1, hit.hardSets / 8);
      const volFactor = Math.min(1, hit.volume / 8_000);
      const drop =
        (18 + setsFactor * 42 + volFactor * 28) *
        hit.intensityFactor *
        hit.loadFactor;
      percent = Math.max(5, percent - drop);

      // Hours needed to recover from 0→100 under this load profile
      lastHoursForFull =
        baseHours *
        (1 + Math.min(0.7, hit.hardSets / 12) + Math.min(0.5, hit.volume / 10_000)) *
        hit.intensityFactor;
      lastAt = hit.at;
      lastHardSets = Math.round(hit.hardSets);
    }

    if (lastAt) {
      const sinceH = (now.getTime() - lastAt.getTime()) / 3_600_000;
      percent = applyRecovery(percent, sinceH, lastHoursForFull);
    }

    const recoveryPercent = Math.min(100, Math.max(0, Math.round(percent)));
    const deficit = 100 - recoveryPercent;
    const hoursToFull =
      deficit <= 0
        ? 0
        : Math.round(((deficit / 100) * lastHoursForFull) * 10) / 10;

    return {
      muscle,
      label: MUSCLE_LABELS[muscle] ?? muscle,
      recoveryPercent,
      status: statusFromPercent(recoveryPercent),
      volume7d: Math.round(volume),
      lastTrainedAt: lastAt?.toISOString() ?? null,
      recoveryHoursRequired: hoursToFull,
      setsLastSession: lastHardSets,
      computedAt,
      hoursToFull,
    };
  });

  const recentSessions = sessions.filter(
    (s) => (s.completedAt ?? s.startedAt).getTime() >= weekAgo
  );
  const avgVolume =
    Object.values(muscleVolume7d).reduce((a, b) => a + b, 0) /
    Math.max(1, Object.keys(muscleVolume7d).length);
  const deloadRecommended = recentSessions.length >= 4 && avgVolume > 50_000;

  const highlights = DASHBOARD_MUSCLES.map((m) => {
    const row = muscles.find((r) => r.muscle === m);
    return {
      label: row?.label ?? MUSCLE_LABELS[m],
      recoveryPercent: row?.recoveryPercent ?? 100,
    };
  });

  const avgRecovery =
    muscles.reduce((s, m) => s + m.recoveryPercent, 0) / Math.max(1, muscles.length);

  return {
    muscles,
    deloadRecommended,
    fatigueScore: deloadRecommended ? 72 : Math.round(100 - avgRecovery),
    highlights,
  };
}
