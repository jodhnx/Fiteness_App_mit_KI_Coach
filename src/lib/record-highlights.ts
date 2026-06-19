import { prisma } from "@/lib/prisma";
import { setVolume } from "@/lib/workout-metrics";

export const KEY_LIFTS = [
  {
    id: "bench",
    label: "Bankdrücken",
    slugParts: ["bench-press", "bankdruecken", "barbell-bench"],
    nameParts: ["bankdrück", "bench press", "bankdruck"],
  },
  {
    id: "squat",
    label: "Kniebeuge",
    slugParts: ["squat", "kniebeuge", "back-squat"],
    nameParts: ["kniebeug", "squat"],
  },
  {
    id: "deadlift",
    label: "Kreuzheben",
    slugParts: ["deadlift", "kreuzheben"],
    nameParts: ["kreuzheb", "deadlift"],
  },
  {
    id: "ohp",
    label: "Schulterdrücken",
    slugParts: ["overhead-press", "shoulder-press", "military-press"],
    nameParts: ["schulterdrück", "overhead press", "shoulder press"],
  },
] as const;

export type KeyLiftRecord = {
  id: string;
  label: string;
  exerciseName: string | null;
  weightKg: number | null;
  reps: number | null;
  achievedAt: string | null;
};

export type RecordHighlights = {
  heaviestSet: { weightKg: number; reps: number; exerciseName: string; date: string } | null;
  mostReps: { reps: number; weightKg: number; exerciseName: string; date: string } | null;
  highestSessionVolume: { volumeKg: number; sessionName: string; date: string } | null;
};

function matchesLift(
  slug: string,
  name: string,
  slugParts: readonly string[],
  nameParts: readonly string[]
) {
  const s = slug.toLowerCase();
  const n = name.toLowerCase();
  return slugParts.some((p) => s.includes(p)) || nameParts.some((p) => n.includes(p));
}

export async function buildKeyLiftRecords(userId: string): Promise<KeyLiftRecord[]> {
  const records = await prisma.personalRecord.findMany({
    where: { userId, recordType: "MAX_WEIGHT" },
    include: { exercise: true },
    orderBy: { value: "desc" },
  });

  return KEY_LIFTS.map((lift) => {
    const match = records.find((r) =>
      matchesLift(r.exercise.slug, r.exercise.name, lift.slugParts, lift.nameParts)
    );
    if (!match) {
      return {
        id: lift.id,
        label: lift.label,
        exerciseName: null,
        weightKg: null,
        reps: null,
        achievedAt: null,
      };
    }
    return {
      id: lift.id,
      label: lift.label,
      exerciseName: match.exercise.name,
      weightKg: match.weightKg ?? match.value,
      reps: match.reps,
      achievedAt: match.achievedAt.toISOString(),
    };
  });
}

export async function buildRecordHighlights(userId: string): Promise<RecordHighlights> {
  const completedSets = await prisma.workoutSet.findMany({
    where: {
      session: { userId, status: "COMPLETED" },
      completed: true,
    },
    include: { session: true },
    orderBy: { weightKg: "desc" },
    take: 500,
  });

  let heaviestSet: RecordHighlights["heaviestSet"] = null;
  let mostReps: RecordHighlights["mostReps"] = null;

  for (const set of completedSets) {
    const w = set.weightKg ?? 0;
    const r = set.reps ?? 0;
    const date = (set.session.completedAt ?? set.session.startedAt).toISOString();
    if (w > 0 && (!heaviestSet || w > heaviestSet.weightKg)) {
      heaviestSet = { weightKg: w, reps: r, exerciseName: set.exerciseName, date };
    }
    if (r > 0 && (!mostReps || r > mostReps.reps)) {
      mostReps = { reps: r, weightKg: w, exerciseName: set.exerciseName, date };
    }
  }

  const sessions = await prisma.workoutSession.findMany({
    where: { userId, status: "COMPLETED" },
    include: { sets: true },
    orderBy: { completedAt: "desc" },
    take: 100,
  });

  let highestSessionVolume: RecordHighlights["highestSessionVolume"] = null;
  for (const s of sessions) {
    let vol = 0;
    for (const set of s.sets) vol += setVolume(set.reps, set.weightKg);
    if (!highestSessionVolume || vol > highestSessionVolume.volumeKg) {
      highestSessionVolume = {
        volumeKg: Math.round(vol),
        sessionName: s.name,
        date: (s.completedAt ?? s.startedAt).toISOString(),
      };
    }
  }

  return { heaviestSet, mostReps, highestSessionVolume };
}
