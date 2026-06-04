"use client";

import Link from "next/link";
import { CalendarDays, ChevronRight } from "lucide-react";
import type { HomeDataPayload } from "@/lib/home-defaults";

export function HomeWeekOverview({ home }: { home: HomeDataPayload }) {
  const w = home.weeklyReport;
  const week = home.activityWeek;
  if (!w && week.count === 0) return null;

  const weight =
    w?.weightChangeKg != null
      ? `${w.weightChangeKg > 0 ? "+" : ""}${w.weightChangeKg} kg`
      : "—";

  return (
    <section className="rounded-2xl border border-white/10 bg-zinc-900/60 p-4">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold text-white flex items-center gap-2">
          <CalendarDays className="h-4 w-4 text-accent" />
          Wochenübersicht
        </h2>
        <Link
          href="/progress"
          prefetch
          className="text-xs text-zinc-500 flex items-center gap-0.5 hover:text-accent"
        >
          Details <ChevronRight className="h-3.5 w-3.5" />
        </Link>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <Stat label="Training" value={`${w?.workouts ?? week.count}×`} />
        <Stat
          label="Schritte"
          value={
            w?.totalSteps
              ? w.totalSteps.toLocaleString("de-AT")
              : week.totalDistanceM > 0
                ? `${Math.round(week.totalDistanceM / 1000)} km`
                : "—"
          }
        />
        <Stat
          label="Ø Protein"
          value={w?.avgProteinG ? `${Math.round(w.avgProteinG)} g` : "—"}
        />
        <Stat label="Gewicht" value={weight} />
      </div>
      {w?.summaryLine && (
        <p className="text-[11px] text-zinc-500 mt-2 line-clamp-2">{w.summaryLine}</p>
      )}
    </section>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-black/30 px-3 py-2.5">
      <p className="text-[10px] uppercase tracking-wide text-zinc-500">{label}</p>
      <p className="text-lg font-bold text-white tabular-nums mt-0.5">{value}</p>
    </div>
  );
}
