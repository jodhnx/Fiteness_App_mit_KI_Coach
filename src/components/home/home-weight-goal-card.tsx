"use client";

import Link from "next/link";
import { Scale, ChevronRight } from "lucide-react";
import { MacroProgressBar } from "@/components/home/macro-progress-bar";
import type { HomeDataPayload } from "@/lib/home-defaults";

export function HomeWeightGoalCard({
  weightGoal,
  calorieTarget,
}: {
  weightGoal: NonNullable<HomeDataPayload["weightGoal"]>;
  calorieTarget?: number;
}) {
  return (
    <Link
      href="/settings#ziele"
      prefetch
      className="block rounded-2xl border border-emerald-500/25 bg-gradient-to-br from-emerald-950/30 to-zinc-900/90 p-4 active:opacity-95"
    >
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold text-white flex items-center gap-2">
          <Scale className="h-4 w-4 text-emerald-400" />
          Zielgewicht
        </h2>
        <ChevronRight className="h-4 w-4 text-zinc-600" />
      </div>
      <div className="grid grid-cols-3 gap-2 text-center text-sm mb-3">
        <div>
          <p className="text-[10px] text-zinc-500">Aktuell</p>
          <p className="font-bold text-white tabular-nums">{weightGoal.currentKg} kg</p>
        </div>
        <div>
          <p className="text-[10px] text-zinc-500">Ziel</p>
          <p className="font-bold text-accent tabular-nums">{weightGoal.targetKg} kg</p>
        </div>
        <div>
          <p className="text-[10px] text-zinc-500">Tage</p>
          <p className="font-bold text-white tabular-nums">{weightGoal.daysRemaining}</p>
        </div>
      </div>
      <div className="flex justify-between text-xs text-zinc-400 mb-1">
        <span>Fortschritt</span>
        <span className="text-white font-semibold tabular-nums">{weightGoal.percent}%</span>
      </div>
      <MacroProgressBar consumed={weightGoal.percent} target={100} className="h-2" />
      {calorieTarget != null && (
        <p className="text-xs text-emerald-300/90 mt-2 tabular-nums">
          Empfohlenes Kalorienziel: {calorieTarget} kcal/Tag
        </p>
      )}
    </Link>
  );
}
