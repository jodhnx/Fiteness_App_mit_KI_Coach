"use client";

import { memo } from "react";
import { Droplets } from "lucide-react";

type Props = {
  consumedMl: number;
  targetMl: number;
  onAdd: (ml: number) => void;
};

function formatLiters(ml: number) {
  return (ml / 1000).toFixed(1).replace(".", ",");
}

/** Compact water row — not a large card. */
export const WaterTracker = memo(function WaterTracker({
  consumedMl,
  targetMl,
  onAdd,
}: Props) {
  const canRemove = consumedMl > 0;
  return (
    <section className="flex items-center gap-2 px-0.5 py-1.5 min-h-12">
      <Droplets
        className="h-4 w-4 shrink-0 text-[var(--nutrition-water)]"
        aria-hidden
      />
      <p className="text-sm text-zinc-300 flex-1 min-w-0 tabular-nums">
        <span className="font-semibold text-white">{formatLiters(consumedMl)}</span>
        <span className="text-zinc-500"> / {formatLiters(targetMl)} L</span>
      </p>
      <button
        type="button"
        disabled={!canRemove}
        className="h-11 min-w-[5.5rem] rounded-xl border border-white/[0.08] text-xs font-semibold text-zinc-300 disabled:opacity-35 hover:text-white"
        onClick={() => onAdd(-250)}
        aria-label="250 Milliliter Wasser entfernen"
      >
        −250 ml
      </button>
      <button
        type="button"
        className="h-11 min-w-[5.5rem] rounded-xl bg-[var(--nutrition-water-soft)] text-xs font-semibold text-[var(--nutrition-water)] hover:brightness-110"
        onClick={() => onAdd(250)}
        aria-label="250 Milliliter Wasser hinzufügen"
      >
        +250 ml
      </button>
    </section>
  );
});
