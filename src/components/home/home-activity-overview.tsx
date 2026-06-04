"use client";

import Link from "next/link";
import { Footprints, ChevronRight } from "lucide-react";
import type { HomeDataPayload } from "@/lib/home-defaults";

export function HomeActivityOverview({ home }: { home: HomeDataPayload }) {
  const steps = home.healthToday?.steps ?? 0;
  const stepGoal = home.healthToday?.stepGoal ?? 10000;
  const week = home.activityWeek;
  const burned = home.caloriesBurnedTotal ?? home.healthToday?.caloriesBurned ?? 0;

  return (
    <Link
      href="/activities"
      prefetch
      className="block rounded-2xl border border-emerald-500/20 bg-emerald-950/15 p-4 active:opacity-95"
    >
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold text-white flex items-center gap-2">
          <Footprints className="h-4 w-4 text-emerald-400" />
          Aktivitätsübersicht
        </h2>
        <ChevronRight className="h-4 w-4 text-zinc-600" />
      </div>
      <div className="grid grid-cols-3 gap-2 text-center">
        <div className="rounded-xl bg-black/25 py-2.5 px-2">
          <p className="text-[10px] text-zinc-500">Schritte heute</p>
          <p className="text-lg font-bold text-white tabular-nums">
            {steps > 0 ? steps.toLocaleString("de-AT") : "—"}
          </p>
        </div>
        <div className="rounded-xl bg-black/25 py-2.5 px-2">
          <p className="text-[10px] text-zinc-500">Verbrannt</p>
          <p className="text-lg font-bold text-white tabular-nums">{Math.round(burned)}</p>
        </div>
        <div className="rounded-xl bg-black/25 py-2.5 px-2">
          <p className="text-[10px] text-zinc-500">Woche</p>
          <p className="text-lg font-bold text-white tabular-nums">{week.count}×</p>
        </div>
      </div>
      <p className="text-[11px] text-zinc-500 mt-2 tabular-nums">
        Schrittziel {stepGoal.toLocaleString("de-AT")}
        {week.totalCalories ? ` · ${Math.round(week.totalCalories)} kcal Aktivität` : ""}
      </p>
    </Link>
  );
}
