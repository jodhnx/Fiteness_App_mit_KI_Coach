"use client";

import { memo } from "react";
import Link from "next/link";
import { Flame, Zap, Footprints } from "lucide-react";
import type { NutritionDashboardPayload } from "@/lib/nutrition-defaults";
import { MacroProgressBar } from "@/components/home/macro-progress-bar";
import { cn } from "@/lib/utils";

type Props = {
  nutrition: NutritionDashboardPayload;
  steps: number;
  stepGoal: number;
  caloriesBurned: number;
};

export const HeuteHeroCard = memo(function HeuteHeroCard({
  nutrition,
  steps,
  stepGoal,
  caloriesBurned,
}: Props) {
  const { consumed, targets, remaining } = nutrition;
  const eaten = Math.round(consumed.calories);
  const goal = Math.round(targets.calories);
  const left = Math.max(0, Math.round(remaining.calories));
  const overGoal = eaten >= goal && goal > 0;

  return (
    <Link
      href="/nutrition"
      prefetch
      className={cn(
        "block rounded-2xl border border-orange-500/30",
        "bg-gradient-to-br from-orange-950/70 via-zinc-900/95 to-zinc-950 p-5",
        "hover:border-orange-400/45 active:opacity-95 transition-[border-color,opacity] duration-150"
      )}
    >
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-lg font-bold text-white tracking-tight">Heute</h2>
        <Flame className="h-5 w-5 text-orange-400" />
      </div>

      <div className="text-center mb-4">
        <p className="text-xs uppercase tracking-widest text-zinc-500 flex items-center justify-center gap-1">
          <span aria-hidden>🔥</span>
          {overGoal ? "Tagesziel erreicht" : "Kalorien"}
        </p>
        {overGoal ? (
          <>
            <p className="text-5xl sm:text-6xl font-bold text-emerald-400 tabular-nums leading-none mt-2">
              {eaten}
            </p>
            <p className="text-sm text-zinc-400 mt-1">kcal gegessen</p>
            <p className="text-xs text-zinc-500 mt-0.5 tabular-nums">
              Ziel {goal} kcal
            </p>
          </>
        ) : (
          <>
            <p className="text-5xl sm:text-6xl font-bold text-white tabular-nums leading-none mt-2">
              {left}
            </p>
            <p className="text-sm text-zinc-400 mt-1">kcal übrig</p>
            <p className="text-xs text-zinc-500 mt-0.5 tabular-nums">
              {eaten} / {goal} kcal gegessen
            </p>
          </>
        )}
      </div>

      <MacroProgressBar
        consumed={consumed.calories}
        target={targets.calories}
        className="h-2 mb-4"
      />

      <div className="grid grid-cols-2 gap-3 pt-3 border-t border-white/10">
        <div className="rounded-xl bg-black/25 px-3 py-2.5">
          <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wide text-amber-300/90">
            <Zap className="h-3 w-3" />
            Verbrannt
          </div>
          <p className="text-xl font-bold text-white tabular-nums mt-1">
            {Math.round(caloriesBurned)}
            <span className="text-xs font-normal text-zinc-500 ml-1">kcal</span>
          </p>
        </div>
        <div className="rounded-xl bg-black/25 px-3 py-2.5">
          <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wide text-orange-300/90">
            <Flame className="h-3 w-3" />
            Tagesziel
          </div>
          <p className="text-xl font-bold text-white tabular-nums mt-1">
            {goal}
            <span className="text-xs font-normal text-zinc-500 ml-1">kcal</span>
          </p>
        </div>
      </div>

      <div className="mt-3 rounded-xl bg-black/20 px-3 py-2.5 flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wide text-emerald-300/90">
          <Footprints className="h-3 w-3" />
          Schritte
        </div>
        <p className="text-sm font-semibold text-white tabular-nums">
          {steps > 0 ? steps.toLocaleString("de-AT") : "—"}
          <span className="text-zinc-500 font-normal text-xs ml-1">
            / {stepGoal.toLocaleString("de-AT")}
          </span>
        </p>
      </div>
    </Link>
  );
});
