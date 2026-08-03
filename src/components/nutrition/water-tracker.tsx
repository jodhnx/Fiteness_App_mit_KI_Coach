"use client";

import { memo } from "react";
import { Droplets } from "lucide-react";

const QUICK_AMOUNTS = [250, 500, 750] as const;

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
  const pct = Math.min(100, Math.round((consumedMl / Math.max(targetMl, 1)) * 100));
  return (
    <section className="rounded-2xl border border-sky-500/20 bg-sky-950/30 px-3 py-2.5">
      <div className="flex items-center gap-2 mb-1.5">
        <Droplets className="h-4 w-4 text-sky-400 shrink-0" />
        <p className="text-sm font-medium text-white flex-1">
          Wasser{" "}
          <span className="text-sky-300 tabular-nums font-semibold">
            {formatLiters(consumedMl)}
          </span>
          <span className="text-zinc-500 font-normal"> / {formatLiters(targetMl)} L</span>
        </p>
        <div className="h-1.5 w-16 rounded-full bg-zinc-800 overflow-hidden">
          <div
            className="h-full bg-sky-400 transition-[width] duration-200"
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>
      <div className="flex gap-1.5">
        {QUICK_AMOUNTS.map((ml) => (
          <button
            key={ml}
            type="button"
            className="flex-1 h-8 rounded-lg border border-sky-800/50 bg-sky-950/40 text-xs font-semibold text-sky-100 active:bg-sky-900/50"
            onClick={() => onAdd(ml)}
          >
            +{ml}
          </button>
        ))}
      </div>
    </section>
  );
});
