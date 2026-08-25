import {
  analyzeExercisePerformance,
  buildExerciseHistories,
  prioritizePerformanceInsights,
} from "@/lib/intelligence/training-performance/analyze";
import type { TrainingPerformanceLoadResult } from "@/lib/intelligence/training-performance/load-context";
import type { TrainingPerformanceIntelligence } from "@/lib/intelligence/training-performance/types";

function recoveryCaution(
  recoveryScore: number | null,
  trainingReadiness: number | null
): boolean {
  if (recoveryScore != null && recoveryScore < 55) return true;
  if (trainingReadiness != null && trainingReadiness < 50) return true;
  return false;
}

export function buildTrainingPerformanceIntelligence(
  loaded: TrainingPerformanceLoadResult
): TrainingPerformanceIntelligence {
  const caution = recoveryCaution(loaded.recoveryScore, loaded.trainingReadiness);

  const histories = buildExerciseHistories(loaded.planExercises, loaded.sessions).map(
    (data) => ({
      ...data,
      pr: loaded.prsByExercise.has(data.exerciseLibraryId)
        ? {
            weightKg: loaded.prsByExercise.get(data.exerciseLibraryId)!.weightKg,
            achievedAt: loaded.prsByExercise
              .get(data.exerciseLibraryId)!
              .achievedAt.toISOString(),
          }
        : null,
    })
  );

  const exercises = histories.map((data) =>
    analyzeExercisePerformance(data, { recoveryCaution: caution })
  );

  const { primary, secondary } = prioritizePerformanceInsights(exercises);

  const items = [primary, ...secondary].filter(Boolean).map((insight) => ({
    title: insight!.exerciseName,
    explanation: insight!.explanation,
    evidence: insight!.evidence.slice(0, 3),
    confidence: insight!.confidence,
    requiresConfirmation: false,
  }));

  const summary =
    primary?.explanation ??
    (loaded.workoutLabel
      ? `${loaded.workoutLabel}: keine ausreichenden Performance-Daten für konkrete Gewichtsempfehlungen.`
      : "Kein geplantes Training — Performance-Empfehlungen nicht verfügbar.");

  return {
    generatedAt: new Date().toISOString(),
    workoutLabel: loaded.workoutLabel,
    exerciseCount: loaded.exerciseCount,
    recoveryScore: loaded.recoveryScore,
    recoveryCaution: caution,
    exercises,
    primary,
    secondary,
    coachContext: { summary, items },
  };
}

export function formatTrainingPerformanceForCoach(
  intel: TrainingPerformanceIntelligence,
  compact = false
): string[] {
  const lines: string[] = [];

  if (intel.workoutLabel) {
    lines.push(`Heute geplant: ${intel.workoutLabel}`);
  }

  if (intel.recoveryCaution) {
    lines.push(
      `Recovery-Hinweis: ${intel.recoveryScore != null ? `${intel.recoveryScore}%` : "niedrig"} — keine aggressive Progression empfehlen.`
    );
  }

  if (compact) {
    if (intel.primary) {
      lines.push(`PRIMARY: ${intel.primary.explanation}`);
      if (intel.primary.recommendedWeightKg != null) {
        lines.push(
          `Empfehlung: ${intel.primary.recommendedWeightKg} kg × ${intel.primary.recommendedRepRange ?? "?"}`
        );
      }
    } else {
      lines.push(intel.coachContext.summary);
    }
    return lines;
  }

  for (const ex of intel.exercises.slice(0, 6)) {
    if (!ex.lastPerformance && ex.progressionState === "insufficient_data") {
      lines.push(`${ex.exerciseName}: keine History`);
      continue;
    }
    const perf = ex.lastPerformance
      ? `Letzte: ${ex.lastPerformance.weightKg} kg × ${ex.lastPerformance.reps}`
      : "Letzte: keine Daten";
    const rec =
      ex.recommendedWeightKg != null
        ? ` → ${ex.recommendedWeightKg} kg × ${ex.recommendedRepRange ?? "?"} (${ex.progressionState})`
        : ex.recommendedRepRange
          ? ` → ${ex.recommendedRepRange} Reps (${ex.progressionState})`
          : ` (${ex.progressionState})`;
    lines.push(`${ex.exerciseName}: ${perf}${rec}`);
    if (ex.prHighlight) lines.push(`  ${ex.prHighlight}`);
  }

  if (intel.primary) {
    lines.push(`Priorität: ${intel.primary.explanation}`);
  }

  return lines;
}
