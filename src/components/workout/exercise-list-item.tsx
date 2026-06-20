"use client";

import { memo } from "react";
import { cn } from "@/lib/utils";

type Props = {
  name: string;
  sets: number;
  reps: string;
  className?: string;
};

/** Simple exercise row: "Bankdrücken — 3 Sätze × 12 Wiederholungen" */
export const ExerciseListItem = memo(function ExerciseListItem({
  name,
  sets,
  reps,
  className,
}: Props) {
  const repLabel = reps.includes("-") || reps.includes("–") ? reps : `${reps} Wiederholungen`;

  return (
    <li
      className={cn(
        "rounded-xl border border-zinc-800 bg-zinc-900/50 px-4 py-3.5 text-sm text-zinc-200",
        className
      )}
    >
      <span className="font-semibold text-white">{name}</span>
      <span className="text-zinc-500"> — </span>
      <span className="text-zinc-400">
        {sets} {sets === 1 ? "Satz" : "Sätze"} × {repLabel}
      </span>
    </li>
  );
});
