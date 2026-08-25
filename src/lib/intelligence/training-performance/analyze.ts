import { parsePlanSetTargets } from "@/lib/plan-exercise-sets";
import { setVolume } from "@/lib/workout-metrics";
import type {
  CompletedSetRow,
  ExercisePerformanceData,
  ExercisePerformanceInsight,
  PerformanceConfidence,
  PlanExerciseRow,
  ProgressionState,
  SessionExercisePerformance,
  SetPerformance,
} from "@/lib/intelligence/training-performance/types";

export function parseRepRange(
  raw: string | null | undefined
): { min: number; max: number } | null {
  if (!raw?.trim()) return null;
  const range = raw.match(/(\d+)\s*[-–]\s*(\d+)/);
  if (range) {
    return { min: Number(range[1]), max: Number(range[2]) };
  }
  const single = raw.match(/(\d+)/);
  if (single) {
    const n = Number(single[1]);
    return { min: n, max: n };
  }
  return null;
}

export function bestSetScore(reps: number, weightKg: number): number {
  return weightKg * 1000 + reps;
}

export function pickBestSet(sets: SetPerformance[]): SetPerformance | null {
  if (!sets.length) return null;
  return sets.reduce((best, cur) =>
    bestSetScore(cur.reps, cur.weightKg) > bestSetScore(best.reps, best.weightKg)
      ? cur
      : best
  );
}

export function weightIncrement(currentKg: number): number {
  return currentKg >= 100 ? 5 : 2.5;
}

export function roundWeightKg(kg: number): number {
  return Math.round(kg * 2) / 2;
}

export function suggestNextWeight(currentKg: number): number {
  return roundWeightKg(currentKg + weightIncrement(currentKg));
}

export function formatRepRange(range: { min: number; max: number } | null): string | null {
  if (!range) return null;
  return range.min === range.max ? String(range.min) : `${range.min}–${range.max}`;
}

export function repTargetForMaintain(
  lastReps: number,
  range: { min: number; max: number } | null
): string | null {
  if (!range) return null;
  if (lastReps >= range.max) return `${range.max}`;
  if (lastReps < range.min) return `${range.min}–${range.max}`;
  return `${lastReps}–${range.max}`;
}

function planWeightFromTargets(row: PlanExerciseRow): number | null {
  const targets = parsePlanSetTargets(
    row.setTargets,
    row.targetSets,
    row.targetReps
  );
  const weights = targets
    .map((t) => t.weightKg)
    .filter((w): w is number => w != null && w > 0);
  if (!weights.length) return null;
  return weights[0] ?? null;
}

/** Build per-exercise session history from recent completed sessions. */
export function buildExerciseHistories(
  planExercises: PlanExerciseRow[],
  sessions: { completedAt: Date | null; sets: CompletedSetRow[] }[]
): ExercisePerformanceData[] {
  const exerciseIds = new Set(planExercises.map((e) => e.exerciseLibraryId));

  return planExercises.map((row) => {
    const history: SessionExercisePerformance[] = [];

    for (const session of sessions) {
      if (!session.completedAt) continue;
      const setsForExercise = session.sets
        .filter(
          (s) =>
            s.completed &&
            s.exerciseLibraryId === row.exerciseLibraryId &&
            s.reps != null &&
            s.weightKg != null &&
            s.weightKg > 0
        )
        .map((s) => ({
          weightKg: s.weightKg!,
          reps: s.reps!,
          setNumber: s.setNumber,
        }));

      if (!setsForExercise.length) continue;

      const bestSet = pickBestSet(setsForExercise);
      const volumeKg = setsForExercise.reduce(
        (acc, s) => acc + setVolume(s.reps, s.weightKg),
        0
      );

      history.push({
        sessionDate: session.completedAt.toISOString().slice(0, 10),
        sets: setsForExercise,
        bestSet,
        volumeKg,
      });
    }

    history.sort((a, b) => b.sessionDate.localeCompare(a.sessionDate));

    return {
      exerciseLibraryId: row.exerciseLibraryId,
      exerciseName: row.exerciseName,
      targetSets: row.targetSets,
      targetRepRange: parseRepRange(row.targetReps),
      planWeightKg: planWeightFromTargets(row),
      history,
      pr: null,
    };
  }).filter((e) => exerciseIds.has(e.exerciseLibraryId));
}

function scoresEqual(a: SetPerformance, b: SetPerformance): boolean {
  return a.weightKg === b.weightKg && a.reps === b.reps;
}

function detectProgressionState(
  history: SessionExercisePerformance[],
  repRange: { min: number; max: number } | null
): ProgressionState {
  const withBest = history.filter((h) => h.bestSet != null);
  if (withBest.length === 0) return "insufficient_data";
  if (withBest.length === 1) return "insufficient_data";

  const scores = withBest.map((h) => bestSetScore(h.bestSet!.reps, h.bestSet!.weightKg));

  // Declining: at least 3 sessions with consecutive decreases
  if (withBest.length >= 3 && scores[0]! < scores[1]! && scores[1]! < scores[2]!) {
    return "declining";
  }

  // Stalled: 3+ sessions with identical best set
  if (withBest.length >= 3) {
    const first = withBest[0]!.bestSet!;
    const stalledCount = withBest
      .slice(0, 3)
      .filter((h) => scoresEqual(h.bestSet!, first)).length;
    if (stalledCount >= 3) return "stalled";
  }

  const last = withBest[0]!.bestSet!;
  const range = repRange ?? { min: 8, max: 12 };

  if (last.reps >= range.max) {
    return "ready_to_progress";
  }

  if (scores.length >= 2 && scores[0]! > scores[1]!) {
    return "progressing";
  }

  if (last.reps >= range.min && last.reps < range.max) {
    return "maintain";
  }

  return "maintain";
}

function confidenceFor(
  state: ProgressionState,
  sessionCount: number,
  recoveryCaution: boolean
): PerformanceConfidence {
  if (state === "insufficient_data") return "low";
  if (recoveryCaution && state === "ready_to_progress") return "medium";
  if (sessionCount >= 3 && (state === "stalled" || state === "declining")) return "high";
  if (sessionCount >= 2 && state === "ready_to_progress") return "high";
  if (sessionCount >= 2) return "medium";
  return "low";
}

function volumeTrend(
  history: SessionExercisePerformance[]
): "up" | "down" | "stable" | null {
  if (history.length < 2) return null;
  const a = history[0]!.volumeKg;
  const b = history[1]!.volumeKg;
  if (a > b * 1.02) return "up";
  if (a < b * 0.98) return "down";
  return "stable";
}

export function analyzeExercisePerformance(
  data: ExercisePerformanceData,
  options: { recoveryCaution?: boolean; prWithinDays?: number } = {}
): ExercisePerformanceInsight {
  const recoveryCaution = options.recoveryCaution ?? false;
  const history = data.history;
  const last = history[0]?.bestSet ?? null;
  const repRange = data.targetRepRange;

  const state = detectProgressionState(history, repRange);
  const sessionCount = history.filter((h) => h.bestSet).length;
  let confidence = confidenceFor(state, sessionCount, recoveryCaution);

  let recommendedWeightKg: number | null = null;
  let recommendedRepRange: string | null = null;
  const evidence: string[] = [];
  let explanation = "";

  if (last) {
    evidence.push(
      `Letzte Leistung (${history[0]!.sessionDate}): ${last.weightKg} kg × ${last.reps}`
    );
    if (history.length > 1 && history[1]?.bestSet) {
      const prev = history[1].bestSet;
      evidence.push(`Davor: ${prev.weightKg} kg × ${prev.reps}`);
    }
    if (repRange) {
      evidence.push(`Zielbereich: ${formatRepRange(repRange)} Reps`);
    }
    if (data.targetSets) {
      evidence.push(`Plan: ${data.targetSets} Sätze`);
    }
  }

  const vol = volumeTrend(history);
  if (vol === "up" && history.length >= 2) {
    evidence.push(
      `Volumen: ${Math.round(history[0]!.volumeKg)} kg vs. ${Math.round(history[1]!.volumeKg)} kg`
    );
  }

  let prHighlight: string | null = null;
  if (data.pr) {
    prHighlight = `PR ${data.exerciseName}: ${data.pr.weightKg} kg`;
    evidence.push(`PR: ${data.pr.weightKg} kg (${data.pr.achievedAt.slice(0, 10)})`);
  }

  switch (state) {
    case "insufficient_data":
      explanation = `Für ${data.exerciseName} liegen zu wenige vergleichbare Sessions vor.`;
      recommendedWeightKg = null;
      recommendedRepRange = formatRepRange(repRange);
      confidence = "low";
      break;
    case "ready_to_progress":
      if (last && (!recoveryCaution || confidence === "high")) {
        recommendedWeightKg = recoveryCaution ? null : suggestNextWeight(last.weightKg);
        recommendedRepRange = repRange ? String(repRange.min) : null;
        explanation = recoveryCaution
          ? `${data.exerciseName}: ${last.weightKg} kg × ${last.reps} — obere Rep-Range erreicht, aber Recovery niedrig. Heute eher bei ${last.weightKg} kg bleiben.`
          : `${data.exerciseName}: ${last.weightKg} kg × ${last.reps} erreicht — nächstes Mal ${recommendedWeightKg} kg testen (${recommendedRepRange ?? "?"} Reps).`;
      } else if (last) {
        recommendedRepRange = repTargetForMaintain(last.reps, repRange);
        explanation = `${data.exerciseName}: ${last.weightKg} kg × ${last.reps} — Progression möglich, aber Recovery spricht für vorsichtiges Beibehalten.`;
      }
      break;
    case "maintain":
      if (last) {
        recommendedWeightKg = last.weightKg;
        recommendedRepRange = repTargetForMaintain(last.reps, repRange);
        explanation = `${data.exerciseName}: Bei ${last.weightKg} kg bleiben, Ziel ${recommendedRepRange ?? formatRepRange(repRange) ?? "?"} Reps.`;
      }
      break;
    case "progressing":
      if (last) {
        recommendedWeightKg = last.weightKg;
        recommendedRepRange = repTargetForMaintain(last.reps, repRange);
        explanation = `${data.exerciseName}: Leistung steigt — ${last.weightKg} kg × ${last.reps}, weiter ${recommendedRepRange ?? "?"} Reps anpeilen.`;
      }
      break;
    case "stalled":
      if (last) {
        recommendedWeightKg = last.weightKg;
        recommendedRepRange = formatRepRange(repRange);
        explanation = `${data.exerciseName}: ${last.weightKg} kg × ${last.reps} über mehrere Sessions stabil — Technik/Tempo prüfen oder Rep-Range oben anstreben.`;
      }
      break;
    case "declining":
      if (last) {
        recommendedWeightKg = last.weightKg;
        recommendedRepRange = formatRepRange(repRange);
        explanation = `${data.exerciseName}: Leistung in den letzten Sessions zurückgegangen — bei ${last.weightKg} kg saubere Reps priorisieren.`;
        if (recoveryCaution) {
          explanation += " Recovery aktuell niedrig.";
        }
      }
      break;
  }

  if (data.planWeightKg != null && last == null) {
    evidence.push(`Plan-Gewicht: ${data.planWeightKg} kg`);
  }

  return {
    exerciseLibraryId: data.exerciseLibraryId,
    exerciseName: data.exerciseName,
    lastPerformance: last
      ? { weightKg: last.weightKg, reps: last.reps, sessionDate: history[0]!.sessionDate }
      : null,
    targetRepRange: repRange,
    planWeightKg: data.planWeightKg,
    targetSets: data.targetSets,
    progressionState: state,
    recommendedWeightKg,
    recommendedRepRange,
    confidence,
    explanation,
    evidence,
    volumeTrend: vol,
    prHighlight,
  };
}

const STATE_PRIORITY: Record<ProgressionState, number> = {
  ready_to_progress: 100,
  progressing: 80,
  declining: 70,
  stalled: 60,
  maintain: 40,
  insufficient_data: 0,
};

export function prioritizePerformanceInsights(
  insights: ExercisePerformanceInsight[]
): { primary: ExercisePerformanceInsight | null; secondary: ExercisePerformanceInsight[] } {
  const ranked = [...insights]
    .filter((i) => i.progressionState !== "insufficient_data" || i.prHighlight)
    .sort((a, b) => {
      const prBoost = (i: ExercisePerformanceInsight) => (i.prHighlight ? 15 : 0);
      return (
        STATE_PRIORITY[b.progressionState] +
        prBoost(b) -
        (STATE_PRIORITY[a.progressionState] + prBoost(a))
      );
    });

  const primary = ranked[0] ?? null;
  const secondary = ranked.slice(1, 3);
  return { primary, secondary };
}
