import type { RecordType } from "@prisma/client";

export function setVolume(reps: number | null, weightKg: number | null): number {
  return (reps ?? 0) * (weightKg ?? 0);
}

export function estimated1RM(weightKg: number, reps: number): number {
  if (reps <= 0 || weightKg <= 0) return 0;
  if (reps === 1) return weightKg;
  return Math.round(weightKg * (1 + reps / 30) * 10) / 10;
}

export function sessionDurationSec(startedAt: Date, completedAt?: Date | null): number {
  const end = completedAt ?? new Date();
  return Math.max(0, Math.floor((end.getTime() - startedAt.getTime()) / 1000));
}

export type SetInput = {
  exerciseLibraryId?: string | null;
  exerciseName: string;
  setNumber: number;
  reps?: number | null;
  weightKg?: number | null;
  completed?: boolean;
};

export function computePRUpdates(
  sets: SetInput[],
  existing: { recordType: RecordType; value: number }[]
): {
  recordType: RecordType;
  value: number;
  reps?: number;
  weightKg?: number;
  exerciseLibraryId: string;
}[] {
  const byExercise = new Map<string, SetInput[]>();
  for (const s of sets.filter((x) => x.completed !== false)) {
    const key = s.exerciseLibraryId ?? s.exerciseName;
    if (!byExercise.has(key)) byExercise.set(key, []);
    byExercise.get(key)!.push(s);
  }

  const updates: {
    recordType: RecordType;
    value: number;
    reps?: number;
    weightKg?: number;
    exerciseLibraryId: string;
  }[] = [];

  for (const [exId, exSets] of byExercise) {
    if (!exId.startsWith("c")) continue;
    let maxWeight = 0;
    let maxVol = 0;
    let maxReps = 0;
    let best1rm = 0;
    let wFor = 0;
    let rFor = 0;

    for (const s of exSets) {
      const w = s.weightKg ?? 0;
      const r = s.reps ?? 0;
      maxWeight = Math.max(maxWeight, w);
      maxVol = Math.max(maxVol, setVolume(r, w));
      if (r > maxReps) {
        maxReps = r;
      }
      const e1 = estimated1RM(w, r);
      if (e1 > best1rm) {
        best1rm = e1;
        wFor = w;
        rFor = r;
      }
    }

    const prev = (type: RecordType) =>
      existing.find((e) => e.recordType === type)?.value ?? 0;

    if (maxWeight > prev("MAX_WEIGHT")) {
      updates.push({
        recordType: "MAX_WEIGHT",
        value: maxWeight,
        weightKg: maxWeight,
        reps: exSets.find((s) => s.weightKg === maxWeight)?.reps ?? undefined,
        exerciseLibraryId: exId,
      });
    }
    if (maxVol > prev("MAX_VOLUME")) {
      updates.push({
        recordType: "MAX_VOLUME",
        value: maxVol,
        exerciseLibraryId: exId,
      });
    }
    if (maxReps > prev("MAX_REPS")) {
      updates.push({
        recordType: "MAX_REPS",
        value: maxReps,
        reps: maxReps,
        exerciseLibraryId: exId,
      });
    }
    if (best1rm > prev("ESTIMATED_1RM")) {
      updates.push({
        recordType: "ESTIMATED_1RM",
        value: best1rm,
        weightKg: wFor,
        reps: rFor,
        exerciseLibraryId: exId,
      });
    }
  }

  return updates;
}
