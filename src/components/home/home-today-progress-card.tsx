"use client";

import { memo } from "react";
import Link from "next/link";
import type { NutritionDashboardPayload } from "@/lib/nutrition-defaults";
import { hasNutritionTargets } from "@/lib/nutrition-defaults";
import { cn } from "@/lib/utils";
import { Droplets, Footprints } from "lucide-react";
import { CalorieRing } from "@/components/nutrition/calorie-ring";

type Props = {
  nutrition: NutritionDashboardPayload;
  steps: number;
  stepGoal: number;
};

const MACRO_COLORS = {
  protein: { bar: "bg-rose-400", label: "Protein", emoji: "🥩" },
  carbs: { bar: "bg-amber-400", label: "Kohlenhydrate", emoji: "🍚" },
  fat: { bar: "bg-violet-400", label: "Fett", emoji: "🥑" },
} as const;

export const HomeTodayProgressCard = memo(function HomeTodayProgressCard({
  nutrition,
  steps,
  stepGoal,
}: Props) {
  const { consumed, targets, remaining, water } = nutrition;
  const ready = hasNutritionTargets(nutrition);
  const stepPct = stepGoal > 0 ? Math.min(100, Math.round((steps / stepGoal) * 100)) : 0;
  const waterPct =
    water.targetMl > 0
      ? Math.min(100, Math.round((water.consumedMl / water.targetMl) * 100))
      : 0;

  if (!ready) {
    return (
      <Link
        href="/settings"
        prefetch
        className="block rounded-[1.75rem] border border-amber-500/25 bg-gradient-to-br from-zinc-900 to-zinc-950 p-6 text-center"
      >
        <p className="text-sm text-amber-200">Kalorienziel noch nicht eingerichtet</p>
        <p className="text-xs text-zinc-500 mt-2">Profil in den Einstellungen vervollständigen →</p>
      </Link>
    );
  }

  return (
    <Link
      href="/nutrition"
      prefetch
      className={cn(
        "block rounded-[1.75rem] border border-cyan-500/25",
        "bg-gradient-to-br from-zinc-900 via-zinc-900/95 to-zinc-950",
        "p-5 shadow-2xl shadow-black/40 active:scale-[0.995] transition-transform"
      )}
    >
      <CalorieRing
        consumed={consumed.calories}
        target={targets.calories}
        remaining={remaining.calories}
        size={172}
      />

      <div className="mt-4 space-y-2.5">
        {(
          [
            {
              key: "protein" as const,
              consumed: consumed.proteinG,
              target: targets.proteinG,
              remaining: remaining.proteinG,
            },
            {
              key: "carbs" as const,
              consumed: consumed.carbsG,
              target: targets.carbsG,
              remaining: remaining.carbsG,
            },
            {
              key: "fat" as const,
              consumed: consumed.fatG,
              target: targets.fatG,
              remaining: remaining.fatG,
            },
          ] as const
        ).map(({ key, consumed: c, target, remaining: rem }) => {
          const meta = MACRO_COLORS[key];
          const pct =
            target > 0 ? Math.min(100, Math.round((c / target) * 100)) : 0;
          return (
            <div key={key} className="rounded-xl bg-zinc-950/60 border border-zinc-800/70 px-3 py-2.5">
              <div className="flex items-center justify-between gap-2 mb-1.5">
                <span className="text-xs text-zinc-400">
                  <span className="mr-1">{meta.emoji}</span>
                  {meta.label}
                </span>
                <span className="text-xs text-zinc-500 tabular-nums">
                  {Math.round(c)}g · {Math.max(0, Math.round(rem))}g übrig
                </span>
              </div>
              <div className="h-1.5 w-full rounded-full bg-zinc-800 overflow-hidden">
                <div
                  className={cn("h-full rounded-full transition-all duration-300", meta.bar)}
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2.5 pt-3 border-t border-zinc-800/80">
        <MiniStat
          icon={Droplets}
          label="Wasser"
          value={`${(water.consumedMl / 1000).toFixed(1)}L`}
          sub={`${waterPct}% · Ziel ${(water.targetMl / 1000).toFixed(1)}L`}
          accent="text-cyan-400"
          barPct={waterPct}
          barColor="bg-cyan-400"
        />
        <MiniStat
          icon={Footprints}
          label="Schritte"
          value={steps > 0 ? steps.toLocaleString("de-DE") : "0"}
          sub={`${stepPct}% Ziel`}
          accent="text-emerald-400"
          barPct={stepPct}
          barColor="bg-emerald-400"
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
  barPct,
  barColor,
}: {
  icon: typeof Droplets;
  label: string;
  value: string;
  sub: string;
  accent: string;
  barPct: number;
  barColor: string;
}) {
  return (
    <div className="rounded-xl bg-zinc-950/50 border border-zinc-800/60 px-3 py-2.5">
      <div className="flex items-center gap-1.5 mb-1">
        <Icon className={cn("h-3.5 w-3.5", accent)} />
        <span className="text-[10px] text-zinc-500 uppercase tracking-wide">{label}</span>
      </div>
      <p className="text-base font-bold text-white tabular-nums">{value}</p>
      <p className="text-[10px] text-zinc-600 tabular-nums">{sub}</p>
      <div className="h-1 rounded-full bg-zinc-800 mt-2 overflow-hidden">
        <div className={cn("h-full rounded-full", barColor)} style={{ width: `${barPct}%` }} />
      </div>
    </div>
  );
}
