import type { MuscleGroup, PersonalRecord, WorkoutSet } from "@prisma/client";
import { setVolume } from "@/lib/workout-metrics";

const MUSCLE_LABELS: Record<MuscleGroup, string> = {
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

export type SessionAnalysis = {
  totalVolumeKg: number;
  completedSets: number;
  totalSets: number;
  durationSec: number;
  effectivenessScore: number;
  effectivenessLabel: string;
  muscleVolume: { muscle: MuscleGroup; label: string; volume: number }[];
  newPRs: PersonalRecord[];
  deloadSuggested: boolean;
  notes: string[];
};

export function analyzeWorkoutSession(
  sets: (WorkoutSet & { exercise?: { muscleGroup: MuscleGroup } | null })[],
  durationSec: number,
  newPRs: PersonalRecord[],
  recentWeeklyVolume: number
): SessionAnalysis {
  let totalVolumeKg = 0;
  let completedSets = 0;
  const muscleVol: Record<string, number> = {};

  for (const set of sets) {
    if (set.completed) {
      completedSets++;
      const v = setVolume(set.reps, set.weightKg);
      totalVolumeKg += v;
      const mg = set.exercise?.muscleGroup;
      if (mg) muscleVol[mg] = (muscleVol[mg] ?? 0) + v;
    }
  }

  const completionRate = sets.length ? completedSets / sets.length : 0;
  const volumePerMin = durationSec > 0 ? totalVolumeKg / (durationSec / 60) : 0;
  const effectivenessScore = Math.min(
    100,
    Math.round(completionRate * 50 + Math.min(volumePerMin / 50, 1) * 30 + (newPRs.length > 0 ? 20 : 0))
  );

  let effectivenessLabel = "Solide Session";
  if (effectivenessScore >= 85) effectivenessLabel = "Hervorragend";
  else if (effectivenessScore >= 70) effectivenessLabel = "Sehr effektiv";
  else if (effectivenessScore < 50) effectivenessLabel = "Ausbaufähig";

  const deloadSuggested =
    recentWeeklyVolume > 0 &&
    totalVolumeKg > recentWeeklyVolume * 1.35 &&
    completedSets < sets.length * 0.7;

  const notes: string[] = [];
  if (newPRs.length > 0) notes.push(`${newPRs.length} neue Personal Records!`);
  if (completionRate < 0.8) notes.push("Nicht alle Sätze abgeschlossen – Qualität vor Quantität.");
  if (deloadSuggested) notes.push("Hohes Volumen bei niedriger Abschlussrate – Deload in Betracht ziehen.");

  const muscleVolume = Object.entries(muscleVol)
    .map(([muscle, volume]) => ({
      muscle: muscle as MuscleGroup,
      label: MUSCLE_LABELS[muscle as MuscleGroup] ?? muscle,
      volume: Math.round(volume),
    }))
    .sort((a, b) => b.volume - a.volume);

  return {
    totalVolumeKg: Math.round(totalVolumeKg),
    completedSets,
    totalSets: sets.length,
    durationSec,
    effectivenessScore,
    effectivenessLabel,
    muscleVolume,
    newPRs,
    deloadSuggested,
    notes,
  };
}
