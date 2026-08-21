/** Primary muscle groups shown in UI */
export const DISPLAY_MUSCLE_GROUPS = [
  "CHEST",
  "BACK",
  "SHOULDERS",
  "BICEPS",
  "TRICEPS",
  "LEGS",
  "ABS",
] as const;

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

/**
 * Live % from server snapshot.
 * - recoveryPercent: value at computedAt
 * - hoursToFull: hours from computedAt until 100%
 * Falls back to legacy lastTrainedAt / recoveryHoursRequired linear model.
 */
export function liveRecoveryPercent(
  lastTrainedAt: string | null,
  recoveryHoursRequired: number,
  snapshotPercent?: number,
  computedAt?: string | null
): number {
  if (snapshotPercent != null && snapshotPercent >= 100) return 100;
  const anchor = computedAt ?? lastTrainedAt;
  if (!anchor || recoveryHoursRequired <= 0) {
    return snapshotPercent != null ? Math.min(100, Math.max(0, snapshotPercent)) : 100;
  }
  const hoursSince = (Date.now() - new Date(anchor).getTime()) / 3_600_000;
  if (snapshotPercent != null) {
    const remaining = 100 - snapshotPercent;
    if (remaining <= 0) return 100;
    const gain = remaining * Math.min(1, hoursSince / recoveryHoursRequired);
    return Math.min(100, Math.max(0, Math.round(snapshotPercent + gain)));
  }
  return Math.min(
    100,
    Math.max(0, Math.round((hoursSince / recoveryHoursRequired) * 100))
  );
}

export function hoursUntilFullyRecovered(
  livePct: number,
  hoursToFull: number,
  snapshotPercent: number
): number | null {
  if (livePct >= 100 || hoursToFull <= 0) return null;
  const remainingShare = (100 - livePct) / Math.max(1, 100 - snapshotPercent);
  return Math.max(0, Math.round(hoursToFull * remainingShare));
}

export function filterDisplayMuscles(muscles: MuscleRecovery[]): MuscleRecovery[] {
  return DISPLAY_MUSCLE_GROUPS.map(
    (id) =>
      muscles.find((m) => m.muscle === id) ?? {
        muscle: id,
        label: MUSCLE_LABELS[id] ?? id,
        recoveryPercent: 100,
        status: "ready" as const,
        volume7d: 0,
        lastTrainedAt: null,
        recoveryHoursRequired: RECOVERY_HOURS[id] ?? 48,
        setsLastSession: 0,
        computedAt: new Date().toISOString(),
        hoursToFull: 0,
      }
  );
}

export const MUSCLE_LABELS: Record<string, string> = {
  CHEST: "Brust",
  BACK: "Rücken",
  SHOULDERS: "Schultern",
  BICEPS: "Bizeps",
  TRICEPS: "Trizeps",
  LEGS: "Beine",
  ABS: "Bauch",
  FOREARMS: "Unterarme",
  CALVES: "Waden",
  CARDIO: "Cardio",
};

export type MuscleRecovery = {
  muscle: string;
  label: string;
  recoveryPercent: number;
  status: "ready" | "recovering" | "fatigued";
  volume7d: number;
  lastTrainedAt: string | null;
  /** Hours from computedAt until 100% (legacy name kept for API compat) */
  recoveryHoursRequired: number;
  setsLastSession: number;
  /** When recoveryPercent was computed — for live client ticks */
  computedAt?: string;
  /** Alias of recoveryHoursRequired at snapshot */
  hoursToFull?: number;
};

export type RecoverySnapshot = {
  muscles: MuscleRecovery[];
  deloadRecommended: boolean;
  fatigueScore: number;
  highlights: { label: string; recoveryPercent: number }[];
};

const PUSH_MUSCLES = new Set(["CHEST", "SHOULDERS", "TRICEPS"]);
const PULL_MUSCLES = new Set(["BACK", "BICEPS"]);
const LEG_MUSCLES = new Set(["LEGS", "CALVES"]);

export function getPlanRecoveryMessage(
  planMuscleGroups: string[],
  recovery: MuscleRecovery[]
): string {
  const inPlan = recovery.filter((r) => planMuscleGroups.includes(r.muscle));
  if (inPlan.length === 0) return "Plan bereit — starte wenn du möchtest.";

  const fatigued = inPlan.filter((r) => r.recoveryPercent < 70);
  if (fatigued.length > 0) {
    return `${fatigued.map((f) => f.label).join(", ")} benötigen noch Erholung.`;
  }

  const pushInPlan = planMuscleGroups.filter((m) => PUSH_MUSCLES.has(m));
  const pullInPlan = planMuscleGroups.filter((m) => PULL_MUSCLES.has(m));
  const legInPlan = planMuscleGroups.filter((m) => LEG_MUSCLES.has(m));

  const avg = (groups: string[]) => {
    const rows = inPlan.filter((r) => groups.includes(r.muscle));
    if (!rows.length) return 0;
    return rows.reduce((s, r) => s + r.recoveryPercent, 0) / rows.length;
  };

  const pushAvg = avg(pushInPlan);
  const pullAvg = avg(pullInPlan);
  const legAvg = avg(legInPlan);

  if (pushAvg >= 85 && pushInPlan.length >= 2) {
    return "Heute sind Push-Übungen optimal.";
  }
  if (pullAvg >= 85 && pullInPlan.length >= 2) {
    return "Heute sind Pull-Übungen optimal.";
  }
  if (legAvg >= 85 && legInPlan.length >= 1) {
    return "Beine sind erholt — Beintraining passt gut.";
  }

  return "Muskeln sind bereit — gutes Timing für diesen Plan.";
}

export { RECOVERY_HOURS };
