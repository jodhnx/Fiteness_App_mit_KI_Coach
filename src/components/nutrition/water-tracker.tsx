"use client";

import { memo } from "react";
import { Droplets, Minus, Plus } from "lucide-react";

type Props = {
  consumedMl: number;
  targetMl: number;
  onAdd: (ml: number) => void;
};

function formatLiters(ml: number) {
  return (ml / 1000).toFixed(1).replace(".", ",");
}

/** Compact water row — never dominates the Nutrition viewport. */
export const WaterTracker = memo(function WaterTracker({
  consumedMl,
  targetMl,
  onAdd,
}: Props) {
  const canRemove = consumedMl > 0;
  return (
    <section
      className="flex items-center gap-2.5 min-h-11 rounded-2xl border border-zinc-200/90 bg-white px-3 py-2 shadow-sm dark:border-white/[0.08] dark:bg-transparent dark:shadow-none"
      aria-label="Wasser"
    >
      <Droplets
        className="h-4 w-4 shrink-0 text-[var(--nutrition-water)]"
        aria-hidden
      />
      <div className="min-w-0 flex-1">
        <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-zinc-500 leading-none">
          Wasser
        </p>
        <p className="text-sm text-zinc-500 tabular-nums mt-0.5 dark:text-zinc-300">
          <span className="font-semibold text-zinc-900 dark:text-white">
            {formatLiters(consumedMl)}
          </span>
          <span className="text-zinc-500"> / {formatLiters(targetMl)} L</span>
        </p>
      </div>
      <button
        type="button"
        disabled={!canRemove}
        className="h-11 w-11 inline-flex items-center justify-center rounded-xl border border-zinc-200 text-zinc-600 disabled:opacity-35 hover:bg-zinc-50 dark:border-white/[0.08] dark:text-zinc-300 dark:hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60"
        onClick={() => onAdd(-250)}
        aria-label="250 Milliliter Wasser entfernen"
      >
        <Minus className="h-4 w-4" aria-hidden />
      </button>
      <button
        type="button"
        className="h-11 w-11 inline-flex items-center justify-center rounded-xl bg-[var(--nutrition-water-soft)] text-[var(--nutrition-water)] hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60"
        onClick={() => onAdd(250)}
        aria-label="250 Milliliter Wasser hinzufügen"
      >
        <Plus className="h-4 w-4" aria-hidden />
      </button>
    </section>
  );
});
