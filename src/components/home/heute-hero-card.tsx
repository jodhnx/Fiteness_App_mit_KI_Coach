"use client";

import { memo } from "react";
import Link from "next/link";
import { Flame, Zap, Footprints, Target } from "lucide-react";
import type { NutritionDashboardPayload } from "@/lib/nutrition-defaults";
import { MacroProgressBar } from "@/components/home/macro-progress-bar";
import { cn } from "@/lib/utils";

type Props = {
  nutrition: NutritionDashboardPayload;
  steps: number;
  stepGoal: number;
  caloriesBurned: number;
  trainingStreakDays: number;
};

export const HeuteHeroCard = memo(function HeuteHeroCard({
  nutrition,
  steps,
  stepGoal,
  caloriesBurned,
  trainingStreakDays,
}: Props) {
  const { consumed, targets, remaining } = nutrition;
  const eaten = Math.round(consumed.calories);
  const goal = Math.round(targets.calories);
  const left = Math.max(0, Math.round(remaining.calories));
  const overGoal = eaten >= goal && goal > 0;
  const stepPct = stepGoal > 0 ? Math.min(100, Math.round((steps / stepGoal) * 100)) : 0;

  return (
    <div
      className={cn(
        "rounded-2xl border border-orange-500/35 overflow-hidden",
        "bg-gradient-to-br from-orange-600/20 via-zinc-900 to-zinc-950",
        "shadow-[0_8px_32px_-8px_rgba(249,115,22,0.25)]",
        "transform-gpu"
      )}
    >
      <Link
        href="/nutrition"
        prefetch
        className="block p-5 pb-4 active:opacity-95 transition-opacity duration-100"
      >
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-sm font-semibold text-zinc-300 tracking-wide">Heute</h2>
          <Flame className="h-5 w-5 text-orange-400" aria-hidden />
        </div>

        <div className="text-center py-1">
          {overGoal ? (
            <>
              <p className="text-[11px] uppercase tracking-widest text-emerald-400/90">
                Ziel erreicht
              </p>
              <p className="text-5xl font-bold text-emerald-400 tabular-nums leading-none mt-1">
                0
              </p>
              <p className="text-base font-medium text-white mt-1">kcal übrig</p>
              <p className="text-xs text-zinc-500 mt-1 tabular-nums">
                {eaten} gegessen · Ziel {goal}
              </p>
            </>
          ) : (
            <>
              <p className="text-[11px] uppercase tracking-widest text-zinc-500">kcal übrig</p>
              <p className="text-[3.25rem] font-bold text-white tabular-nums leading-none mt-0.5">
                {left}
              </p>
              <p className="text-xs text-zinc-500 mt-1.5 tabular-nums">
                {eaten} / {goal} gegessen
              </p>
            </>
          )}
        </div>

        <MacroProgressBar
          consumed={consumed.calories}
          target={targets.calories}
          className="h-1.5 mt-4"
        />
      </Link>

      <div className="grid grid-cols-3 gap-px bg-white/5 border-t border-white/10">
        <Link
          href="/activities"
          prefetch
          className="bg-black/20 px-3 py-3 active:bg-black/35 transition-colors"
        >
          <div className="flex items-center gap-1 text-[10px] uppercase tracking-wide text-amber-300/90">
            <Zap className="h-3 w-3" />
            Verbrannt
          </div>
          <p className="text-lg font-bold text-white tabular-nums mt-1">
            {Math.round(caloriesBurned)}
          </p>
          <p className="text-[10px] text-zinc-500">kcal heute</p>
        </Link>
        <Link
          href="/activities"
          prefetch
          className="bg-black/20 px-3 py-3 active:bg-black/35 transition-colors"
        >
          <div className="flex items-center gap-1 text-[10px] uppercase tracking-wide text-emerald-300/90">
            <Footprints className="h-3 w-3" />
            Schritte
          </div>
          <p className="text-lg font-bold text-white tabular-nums mt-1">
            {steps > 0 ? steps.toLocaleString("de-AT") : "—"}
          </p>
          <p className="text-[10px] text-zinc-500 tabular-nums">{stepPct}% Ziel</p>
        </Link>
        <Link
          href="/erfolge"
          prefetch
          className="bg-black/20 px-3 py-3 active:bg-black/35 transition-colors"
        >
          <div className="flex items-center gap-1 text-[10px] uppercase tracking-wide text-orange-300/90">
            <Target className="h-3 w-3" />
            Streak
          </div>
          <p className="text-lg font-bold text-white tabular-nums mt-1">
            {trainingStreakDays > 0 ? trainingStreakDays : "—"}
          </p>
          <p className="text-[10px] text-zinc-500">Tage Training</p>
        </Link>
      </div>
    </div>
  );
});
