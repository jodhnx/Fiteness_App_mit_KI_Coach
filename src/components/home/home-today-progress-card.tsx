"use client";

import { memo } from "react";
import Link from "next/link";
import type { NutritionDashboardPayload } from "@/lib/nutrition-defaults";
import { cn } from "@/lib/utils";
import { Droplets, Footprints, Beef, Target } from "lucide-react";

type Props = {
  nutrition: NutritionDashboardPayload;
  steps: number;
  stepGoal: number;
};

export const HomeTodayProgressCard = memo(function HomeTodayProgressCard({
  nutrition,
  steps,
  stepGoal,
}: Props) {
  const { consumed, targets, remaining, water } = nutrition;
  const kcalLeft = Math.max(0, Math.round(remaining.calories));
  const proteinLeft = Math.max(0, Math.round(targets.proteinG - consumed.proteinG));
  const stepPct = stepGoal > 0 ? Math.min(100, Math.round((steps / stepGoal) * 100)) : 0;
  const waterPct =
    water.targetMl > 0
      ? Math.min(100, Math.round((water.consumedMl / water.targetMl) * 100))
      : 0;

  return (
    <Link
      href="/nutrition"
      prefetch
      className={cn(
        "block rounded-3xl border border-zinc-800 bg-gradient-to-br from-zinc-900 via-zinc-900/95 to-zinc-950 p-5",
        "active:scale-[0.99] transition-transform"
      )}
    >
      <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500 mb-3">
        Heutiger Fortschritt
      </p>

      <div className="text-center mb-4">
        <p className="text-[11px] uppercase tracking-widest text-zinc-500">Kalorien übrig</p>
        <p className="text-5xl font-bold text-white tabular-nums leading-none mt-1">
          {kcalLeft}
        </p>
        <p className="text-xs text-zinc-500 mt-1 tabular-nums">
          {Math.round(consumed.calories)} / {Math.round(targets.calories)} gegessen
        </p>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <MiniStat
          icon={Beef}
          label="Protein"
          value={`${proteinLeft}g`}
          sub={`/${Math.round(targets.proteinG)}g`}
          accent="text-rose-400"
        />
        <MiniStat
          icon={Droplets}
          label="Wasser"
          value={`${(water.consumedMl / 1000).toFixed(1)}L`}
          sub={`${waterPct}%`}
          accent="text-cyan-400"
        />
        <MiniStat
          icon={Footprints}
          label="Schritte"
          value={steps > 0 ? steps.toLocaleString("de-DE") : "—"}
          sub={`${stepPct}%`}
          accent="text-emerald-400"
        />
        <MiniStat
          icon={Target}
          label="Kalorien"
          value={`${Math.round(consumed.calories)}`}
          sub={`/${Math.round(targets.calories)}`}
          accent="text-violet-400"
        />
      </div>
    </Link>
  );
});

function MiniStat({
  icon: Icon,
  label,
  value,
  sub,
  accent,
}: {
  icon: typeof Beef;
  label: string;
  value: string;
  sub: string;
  accent: string;
}) {
  return (
    <div className="rounded-2xl bg-zinc-950/60 border border-zinc-800/80 px-2 py-3 text-center">
      <Icon className={cn("h-4 w-4 mx-auto mb-1", accent)} />
      <p className="text-[10px] text-zinc-500 uppercase">{label}</p>
      <p className="text-sm font-bold text-white tabular-nums">{value}</p>
      <p className="text-[10px] text-zinc-600 tabular-nums">{sub}</p>
    </div>
  );
}
