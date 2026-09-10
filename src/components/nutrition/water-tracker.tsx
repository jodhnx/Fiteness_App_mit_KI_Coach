"use client";

import { memo } from "react";

type Props = {
  consumedMl: number;
  targetMl: number;
  onAdd: (ml: number) => void;
};

function formatLiters(ml: number) {
  return (ml / 1000).toFixed(1).replace(".", ",");
}

export const WaterTracker = memo(function WaterTracker({
  consumedMl,
  targetMl,
  onAdd,
}: Props) {
  const canRemove = consumedMl > 0;
  return (
    <section className="rounded-xl border border-white/[0.08] bg-zinc-900/70 px-3 py-2">
      <div className="flex items-center gap-2">
        <p className="text-sm font-medium text-white flex-1">
          Wasser{" "}
          <span className="tabular-nums font-semibold">
            {formatLiters(consumedMl)}
          </span>
          <span className="text-zinc-500 font-normal"> / {formatLiters(targetMl)} L</span>
        </p>
        <button
          type="button"
          disabled={!canRemove}
          className="h-11 min-w-[4.5rem] rounded-xl border border-white/10 px-2 text-xs font-semibold text-zinc-200 disabled:opacity-40"
          onClick={() => onAdd(-250)}
          aria-label="250 Milliliter Wasser entfernen"
        >
          −250 ml
        </button>
        <button
          type="button"
          className="h-11 min-w-[4.5rem] rounded-xl border border-white/10 px-2 text-xs font-semibold text-zinc-200"
          onClick={() => onAdd(250)}
          aria-label="250 Milliliter Wasser hinzufügen"
        >
          +250 ml
        </button>
      </div>
    </section>
  );
});
