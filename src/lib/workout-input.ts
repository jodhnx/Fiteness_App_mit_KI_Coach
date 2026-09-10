/** Sanitize / parse gym numeric inputs. Never invent defaults. */

export function sanitizeWeightInput(raw: string): string {
  const v = raw.replace(",", ".").replace(/[^0-9.]/g, "");
  const i = v.indexOf(".");
  if (i === -1) return v.slice(0, 5);
  return `${v.slice(0, i).slice(0, 4)}.${v.slice(i + 1).replace(/\./g, "").slice(0, 1)}`;
}

export function parseWeightKg(raw: string): number | null {
  const v = sanitizeWeightInput(raw);
  if (v === "" || v === ".") return null;
  const n = Number(v);
  if (!Number.isFinite(n) || n < 0 || n > 999.9) return null;
  return Math.round(n * 10) / 10;
}

export function sanitizeRepsInput(raw: string): string {
  return raw.replace(/[^0-9]/g, "").slice(0, 3);
}

export function parseReps(raw: string): number | null {
  const v = sanitizeRepsInput(raw);
  if (v === "") return null;
  const n = Number(v);
  if (!Number.isInteger(n) || n < 1 || n > 100) return null;
  return n;
}

function isRealPerformance(weightKg: number | null, reps: number | null) {
  const w = weightKg ?? 0;
  const r = reps ?? 0;
  return w > 0 || r > 0;
}

export function lastPerformanceLines(
  sets: { weightKg: number | null; reps: number | null; workoutSessionId?: string | null }[]
): string[] {
  if (!sets.length) return [];
  const lastSid = sets[0]?.workoutSessionId;
  const last =
    lastSid != null
      ? sets.filter((s) => s.workoutSessionId === lastSid)
      : [sets[0]];
  return last
    .filter((s) => isRealPerformance(s.weightKg, s.reps))
    .map((s) => {
      const w = s.weightKg;
      const r = s.reps;
      if (w != null && r != null) return `${w} KG × ${r}`;
      if (w != null) return `${w} KG`;
      return `${r} Wdh`;
    });
}

export function formatLastPerformance(
  sets: { weightKg: number | null; reps: number | null; workoutSessionId?: string | null }[]
): string | null {
  const lines = lastPerformanceLines(sets);
  if (!lines.length) return null;
  const first = sets[0];
  const lastSid = first?.workoutSessionId;
  const last =
    lastSid != null ? sets.filter((s) => s.workoutSessionId === lastSid) : [first];
  const usable = last.filter((s) => isRealPerformance(s.weightKg, s.reps));
  if (
    usable.length > 1 &&
    usable.every(
      (s) => s.weightKg === usable[0]?.weightKg && s.reps === usable[0]?.reps
    ) &&
    usable[0]?.weightKg != null &&
    usable[0]?.reps != null
  ) {
    return `${usable[0].weightKg} KG × ${usable[0].reps}`;
  }
  return lines[0] ?? null;
}

/** MM:SS under 1h, H:MM:SS at/after 1h. */
export function formatWorkoutClock(totalSec: number): string {
  const s = Math.max(0, Math.floor(totalSec));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (h > 0) {
    return `${h}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
  }
  return `${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
}

/** True when a completed session weight is strictly higher than previous completed history. */
export function isNewWeightPr(
  sessionSets: { completed?: boolean | null; weightKg?: number | null }[],
  previousSets: { weightKg?: number | null }[]
): boolean {
  const sessionMax = Math.max(
    0,
    ...sessionSets.filter((s) => s.completed === true).map((s) => s.weightKg ?? 0)
  );
  if (sessionMax <= 0) return false;
  const prevMax = Math.max(0, ...previousSets.map((s) => s.weightKg ?? 0));
  if (prevMax <= 0) return false;
  return sessionMax > prevMax;
}

export function validateCompleteSet(
  weightRaw: string,
  repsRaw: string
):
  | { ok: true; weightKg: number; reps: number }
  | { ok: false; error: string } {
  const reps = parseReps(repsRaw);
  const weight = parseWeightKg(weightRaw);
  if (reps == null) {
    return { ok: false, error: "Wiederholungen eingeben (1–100)" };
  }
  if (weight == null) {
    return { ok: false, error: "Gewicht eingeben" };
  }
  return { ok: true, weightKg: weight, reps };
}
