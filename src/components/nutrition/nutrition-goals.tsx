"use client";

import { memo } from "react";
import { NUTRITION_GOAL_LABELS } from "@/lib/nutrition";
import type { NutritionGoal } from "@prisma/client";

const GOALS: NutritionGoal[] = [
  "MUSCLE_GAIN",
  "FAT_LOSS",
  "MAINTENANCE",
  "LEAN_BULK",
  "RECOMP",
];

type Props = {
  current: NutritionGoal | null;
  onSelect: (goal: NutritionGoal) => void;
  loading?: boolean;
};

export const NutritionGoals = memo(function NutritionGoals({
  current,
  onSelect,
  loading,
}: Props) {
  return (
    <div className="flex flex-wrap gap-2">
      {GOALS.map((g) => (
        <button
          key={g}
          type="button"
          disabled={loading}
          onClick={() => onSelect(g)}
          className={`rounded-full px-4 py-2 text-sm font-medium transition-all ${
            current === g
              ? "bg-cyan-500 text-zinc-950"
              : "bg-zinc-800 text-zinc-300 border border-zinc-700 hover:border-cyan-500/40"
          }`}
        >
          {NUTRITION_GOAL_LABELS[g]}
        </button>
      ))}
    </div>
  );
});
