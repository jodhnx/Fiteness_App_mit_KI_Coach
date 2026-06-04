"use client";

import Link from "next/link";
import { Calendar, ChevronRight } from "lucide-react";
import type { HomeDataPayload } from "@/lib/home-defaults";

export function HomePlannedWorkouts({
  home,
}: {
  home: HomeDataPayload;
}) {
  const workouts = home.weeklyReport?.workouts ?? home.activityWeek.count;
  const next = home.nextWorkout;

  return (
    <section className="rounded-2xl border border-cyan-500/20 bg-cyan-950/15 p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-white flex items-center gap-2">
          <Calendar className="h-4 w-4 text-cyan-400" />
          Trainingswoche
        </h2>
        <Link href="/workouts/calendar" prefetch className="text-xs text-cyan-400 flex items-center gap-0.5">
          Kalender <ChevronRight className="h-3.5 w-3.5" />
        </Link>
      </div>
      <p className="text-2xl font-bold text-white tabular-nums">
        {workouts}
        <span className="text-sm font-normal text-zinc-500 ml-1">Einheiten diese Woche</span>
      </p>
      {next ? (
        <Link
          href="/workouts"
          prefetch
          className="flex items-center justify-between rounded-xl bg-black/30 px-3 py-2.5 text-sm text-zinc-200 active:bg-black/50"
        >
          <span className="truncate">
            Nächstes: <span className="text-white font-medium">{next.dayName}</span>
          </span>
          <ChevronRight className="h-4 w-4 shrink-0 text-zinc-500" />
        </Link>
      ) : (
        <Link href="/workouts" prefetch className="text-sm text-cyan-400">
          Training planen →
        </Link>
      )}
    </section>
  );
}
