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

  const best = [...inPlan].sort((a, b) => b.recoveryPercent - a.recoveryPercent)[0];
  return `${best?.label ?? "Training"} ist gut regeneriert (${best?.recoveryPercent ?? 100}%).`;
}
