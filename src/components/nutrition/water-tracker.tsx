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
    <section className="flex items-center gap-2 px-0.5 py-1">
      <p className="text-sm text-zinc-300 flex-1 min-w-0">
        Wasser{" "}
        <span className="tabular-nums font-semibold text-white">
          {formatLiters(consumedMl)}
        </span>
        <span className="text-zinc-500"> / {formatLiters(targetMl)} L</span>
      </p>
      <button
        type="button"
        disabled={!canRemove}
        className="h-11 min-w-[4.25rem] rounded-xl text-xs font-semibold text-zinc-300 disabled:opacity-35 hover:text-white"
        onClick={() => onAdd(-250)}
        aria-label="250 Milliliter Wasser entfernen"
      >
        −250
      </button>
      <button
        type="button"
        className="h-11 min-w-[4.25rem] rounded-xl text-xs font-semibold text-zinc-300 hover:text-white"
        onClick={() => onAdd(250)}
        aria-label="250 Milliliter Wasser hinzufügen"
      >
        +250
      </button>
    </section>
  );
});
