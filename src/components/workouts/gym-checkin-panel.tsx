"use client";

import { cn } from "@/lib/utils";
import type { GymCheckInStats } from "@/lib/gym-checkin";
import { Flame, Calendar } from "lucide-react";

export function GymCheckInPanel({ stats }: { stats: GymCheckInStats }) {
  return (
    <div className="card-premium p-4 space-y-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-cyan-300 flex items-center gap-1">
        <Calendar className="h-3.5 w-3.5" />
        Gym Check-in
      </p>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
        <div className="rounded-lg bg-zinc-900/80 p-2">
          <p className="text-[10px] text-zinc-500">Diese Woche</p>
          <p className="text-lg font-bold text-white">{stats.daysThisWeek}</p>
        </div>
        <div className="rounded-lg bg-zinc-900/80 p-2">
          <p className="text-[10px] text-zinc-500">Dieser Monat</p>
          <p className="text-lg font-bold text-white">{stats.daysThisMonth}</p>
        </div>
        <div className="rounded-lg bg-zinc-900/80 p-2">
          <p className="text-[10px] text-zinc-500 flex items-center justify-center gap-0.5">
            <Flame className="h-3 w-3 text-orange-400" />
            Streak
          </p>
          <p className="text-lg font-bold text-orange-400">{stats.currentStreak}</p>
        </div>
        <div className="rounded-lg bg-zinc-900/80 p-2">
          <p className="text-[10px] text-zinc-500">Längste</p>
          <p className="text-lg font-bold text-white">{stats.longestStreak}</p>
        </div>
      </div>
      <p className="text-sm text-zinc-300 text-center">
        <span className="font-semibold text-white tabular-nums">
          {stats.completedThisMonth} von {stats.plannedThisMonth}
        </span>{" "}
        geplanten Trainingstagen ({stats.quotaPercent}%)
      </p>
      <div className="grid grid-cols-7 gap-1">
        {stats.calendarDays.map((d) => (
          <div
            key={d.date}
            title={d.date}
            className={cn(
              "aspect-square rounded-md flex items-center justify-center text-[10px] font-medium",
              d.trained
                ? "bg-cyan-500/30 text-cyan-100 border border-cyan-500/40"
                : "bg-zinc-800/60 text-zinc-600"
            )}
          >
            {d.label}
          </div>
        ))}
      </div>
    </div>
  );
}
