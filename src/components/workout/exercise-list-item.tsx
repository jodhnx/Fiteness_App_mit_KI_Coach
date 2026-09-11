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
        "rounded-xl border border-zinc-200 bg-white px-4 py-3.5 text-sm text-zinc-700 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/50 dark:text-zinc-200 dark:shadow-none",
        className
      )}
    >
      <span className="font-semibold text-zinc-900 dark:text-white">{name}</span>
      <span className="text-zinc-400 dark:text-zinc-500"> — </span>
      <span className="text-zinc-500 dark:text-zinc-400">
        {sets} {sets === 1 ? "Satz" : "Sätze"} × {repLabel}
      </span>
    </li>
  );
});
