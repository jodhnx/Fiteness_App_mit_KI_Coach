export type PlanSetTarget = {
  weightKg: number | null;
  reps: number | null;
};

export const DEFAULT_SET_COUNT = 3;

export function defaultPlanSets(count = DEFAULT_SET_COUNT): PlanSetTarget[] {
  return Array.from({ length: count }, () => ({ weightKg: null, reps: null }));
}

export function parsePlanSetTargets(
  raw: unknown,
  targetSets: number,
  targetReps?: string | null
): PlanSetTarget[] {
  if (Array.isArray(raw)) {
    const sets = raw
      .filter((s) => s && typeof s === "object")
      .map((s) => {
        const row = s as { weightKg?: unknown; reps?: unknown };
        return {
          weightKg:
            row.weightKg != null && row.weightKg !== ""
              ? Number(row.weightKg)
              : null,
          reps:
            row.reps != null && row.reps !== "" ? Number(row.reps) : null,
        };
      });
    if (sets.length > 0) return sets;
  }

  const count = Math.max(1, targetSets || DEFAULT_SET_COUNT);
  const repGuess = targetReps?.includes("-")
    ? Number.parseInt(targetReps.split("-")[0] ?? "10", 10)
    : Number.parseInt(targetReps ?? "10", 10);
  const reps = Number.isFinite(repGuess) && repGuess > 0 ? repGuess : 10;
  return Array.from({ length: count }, () => ({ weightKg: null, reps }));
}

export function serializePlanSetTargets(sets: PlanSetTarget[]): PlanSetTarget[] {
  return sets.map((s) => ({
    weightKg:
      s.weightKg != null && Number.isFinite(s.weightKg) ? s.weightKg : null,
    reps: s.reps != null && Number.isFinite(s.reps) ? Math.round(s.reps) : null,
  }));
}

export function repsSummaryFromSets(sets: PlanSetTarget[]): string {
  const reps = sets.map((s) => s.reps).filter((r): r is number => r != null && r > 0);
  if (!reps.length) return "8-12";
  const min = Math.min(...reps);
  const max = Math.max(...reps);
  return min === max ? String(min) : `${min}-${max}`;
}
