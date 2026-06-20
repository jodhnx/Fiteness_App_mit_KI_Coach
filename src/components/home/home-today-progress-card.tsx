"use client";

import { memo } from "react";
import Link from "next/link";
import type { NutritionDashboardPayload } from "@/lib/nutrition-defaults";
import { cn } from "@/lib/utils";
import { Droplets, Footprints, Beef } from "lucide-react";

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
  const proteinLeft = Math.max(0, Math.round(remaining.proteinG));
  const stepPct = stepGoal > 0 ? Math.min(100, Math.round((steps / stepGoal) * 100)) : 0;
  const waterPct =
    water.targetMl > 0
      ? Math.min(100, Math.round((water.consumedMl / water.targetMl) * 100))
      : 0;
  const kcalPct =
    targets.calories > 0
      ? Math.min(100, Math.round((consumed.calories / targets.calories) * 100))
      : 0;

  return (
    <Link
      href="/nutrition"
      prefetch
      className={cn(
        "block rounded-[1.75rem] border border-cyan-500/20 bg-gradient-to-br from-zinc-900 via-zinc-900 to-zinc-950",
        "p-6 min-h-[17rem] shadow-xl shadow-black/30 active:scale-[0.99] transition-transform"
      )}
    >
      <div className="text-center mb-6">
        <p className="text-xs font-semibold uppercase tracking-widest text-cyan-400/90">
          Kalorien übrig
        </p>
        <p className="text-7xl font-extrabold text-white tabular-nums leading-none mt-2">
          {targets.calories > 0 ? kcalLeft.toLocaleString("de-DE") : "—"}
        </p>
        <p className="text-sm text-zinc-500 mt-2 tabular-nums">
          {Math.round(consumed.calories)} / {Math.round(targets.calories)} gegessen
        </p>
        <div className="mx-auto mt-3 h-1.5 max-w-xs rounded-full bg-zinc-800 overflow-hidden">
          <div
            className="h-full rounded-full bg-gradient-to-r from-cyan-400 to-emerald-400 transition-all"
            style={{ width: `${kcalPct}%` }}
          />
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <HeroStat
          icon={Beef}
          label="Protein übrig"
          value={targets.proteinG > 0 ? `${proteinLeft}g` : "—"}
          sub={`/${Math.round(targets.proteinG)}g`}
          accent="text-rose-400"
          barPct={
            targets.proteinG > 0
              ? Math.min(100, Math.round((consumed.proteinG / targets.proteinG) * 100))
              : 0
          }
          barColor="bg-rose-400"
        />
        <HeroStat
          icon={Droplets}
          label="Wasser"
          value={`${(water.consumedMl / 1000).toFixed(1)}L`}
          sub={`${waterPct}% Ziel`}
          accent="text-cyan-400"
          barPct={waterPct}
          barColor="bg-cyan-400"
        />
        <HeroStat
          icon={Footprints}
          label="Schritte"
          value={steps > 0 ? steps.toLocaleString("de-DE") : "—"}
          sub={`${stepPct}% Ziel`}
          accent="text-emerald-400"
          barPct={stepPct}
          barColor="bg-emerald-400"
        />
      </div>
    </Link>
  );
});

function HeroStat({
  icon: Icon,
  label,
  value,
  sub,
  accent,
  barPct,
  barColor,
}: {
  icon: typeof Beef;
  label: string;
  value: string;
  sub: string;
  accent: string;
  barPct: number;
  barColor: string;
}) {
  return (
    <div className="rounded-2xl bg-zinc-950/70 border border-zinc-800/80 px-3 py-4 text-center">
      <Icon className={cn("h-5 w-5 mx-auto mb-2", accent)} />
      <p className="text-[10px] text-zinc-500 uppercase tracking-wide leading-tight">{label}</p>
      <p className="text-lg font-bold text-white tabular-nums mt-1">{value}</p>
      <p className="text-[10px] text-zinc-600 tabular-nums mt-0.5">{sub}</p>
      <div className="h-1 rounded-full bg-zinc-800 mt-2 overflow-hidden">
        <div className={cn("h-full rounded-full", barColor)} style={{ width: `${barPct}%` }} />
      </div>
    </div>
  );
}
