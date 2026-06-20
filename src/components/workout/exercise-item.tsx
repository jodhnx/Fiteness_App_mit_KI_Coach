"use client";

import { memo } from "react";
import { parsePlanSetTargets } from "@/lib/plan-exercise-sets";

type Props = {
  name: string;
  targetSets: number;
  targetReps: string;
  restSeconds?: number;
  setTargets?: unknown;
};

function formatWeight(setTargets: unknown, targetSets: number, targetReps?: string | null) {
  const sets = parsePlanSetTargets(setTargets, targetSets, targetReps);
  const withWeight = sets.find((s) => s.weightKg != null && s.weightKg > 0);
  if (withWeight?.weightKg) return `${withWeight.weightKg}kg`;
  return "—";
}

/** Gym check-in exercise row */
export const ExerciseItem = memo(function ExerciseItem({
  name,
  targetSets,
  targetReps,
  restSeconds = 90,
  setTargets,
}: Props) {
  const weight = formatWeight(setTargets, targetSets, targetReps);
  const reps = targetReps?.trim() || "12";

  return (
    <article className="rounded-xl border border-zinc-800 bg-zinc-950/80 overflow-hidden">
      <div className="h-px bg-zinc-700/80" />
      <div className="px-4 py-3.5 space-y-1">
        <h3 className="text-base font-bold text-white uppercase tracking-wide">{name}</h3>
        <p className="text-sm text-zinc-400 tabular-nums">
          {targetSets} Sätze × {reps} Wiederholungen
          <span className="text-zinc-600"> · </span>
          Gewicht: {weight}
          <span className="text-zinc-600"> · </span>
          Pause: {restSeconds}s
        </p>
      </div>
      <div className="h-px bg-zinc-700/80" />
    </article>
  );
});
