"use client";

import { memo } from "react";
import { Button } from "@/components/ui/button";
import { Droplets } from "lucide-react";

const QUICK_AMOUNTS = [250, 500, 750, 1000] as const;

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
    <section className="rounded-2xl border border-sky-500/25 bg-gradient-to-br from-sky-950/50 to-zinc-900/90 p-4">
      <div className="flex items-center gap-2 mb-1">
        <Droplets className="h-6 w-6 text-sky-400" />
        <h3 className="text-lg font-semibold text-white">Wasser</h3>
      </div>
      <p className="text-sm text-zinc-400 mb-3">
        Tagesziel: <span className="text-white font-medium">{formatLiters(targetMl)} L</span>
        {" · "}
        Aktuell: <span className="text-sky-300 font-medium tabular-nums">{formatLiters(consumedMl)} L</span>
        <span className="text-zinc-600 ml-1">({consumedMl} ml)</span>
      </p>
      <div className="h-3 rounded-full bg-zinc-800 overflow-hidden mb-4">
        <div
          className="h-full bg-gradient-to-r from-sky-600 to-cyan-400 transition-[width] duration-200 ease-out"
          style={{ width: `${pct}%` }}
        />
      </div>
      <p className="text-[10px] text-zinc-500 mb-2 uppercase tracking-wide">Schnell hinzufügen</p>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {QUICK_AMOUNTS.map((ml) => (
          <Button
            key={ml}
            type="button"
            variant="outline"
            size="sm"
            className="border-sky-800/60 bg-sky-950/30 hover:bg-sky-900/50 text-sky-100 font-semibold"
            onClick={() => onAdd(ml)}
          >
            +{ml} ml
          </Button>
        ))}
      </div>
    </section>
  );
});
