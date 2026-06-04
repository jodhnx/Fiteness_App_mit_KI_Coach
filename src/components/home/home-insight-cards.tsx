"use client";

import Link from "next/link";
import { HeartPulse, BarChart3, ChevronRight } from "lucide-react";
import type { HomeDataPayload } from "@/lib/home-defaults";

export function HomeInsightCards({ home }: { home: HomeDataPayload }) {
  const recovery = home.recovery?.highlights ?? [];
  const weekly = home.weeklyReport;
  const hasRecovery = recovery.length > 0;
  const hasWeekly = Boolean(weekly);
  if (!hasRecovery && !hasWeekly) return null;

  return (
    <div className="grid grid-cols-2 gap-2">
      {hasRecovery && (
        <Link
          href="/workouts/analytics"
          className="rounded-lg border border-emerald-500/20 bg-emerald-950/20 p-2.5 min-h-[88px] h-full hover:border-emerald-400/35 active:opacity-90"
        >
          <p className="text-[9px] font-semibold uppercase tracking-wide text-emerald-300/90 flex items-center gap-1 mb-2">
            <HeartPulse className="h-3 w-3" />
            Regeneration
          </p>
          <div className="space-y-1">
            {recovery.slice(0, 3).map((m) => (
              <div key={m.label} className="flex justify-between gap-1 text-[11px]">
                <span className="text-zinc-500 truncate">{m.label}</span>
                <span className="font-semibold text-white tabular-nums shrink-0">
                  {m.recoveryPercent}%
                </span>
              </div>
            ))}
          </div>
        </Link>
      )}
      {hasWeekly && weekly && (
        <Link
          href="/progress"
          className="rounded-lg border border-violet-500/20 bg-violet-950/20 p-2.5 min-h-[88px] h-full hover:border-violet-400/35 active:opacity-90"
        >
          <p className="text-[9px] font-semibold uppercase tracking-wide text-violet-300/90 flex items-center gap-1 mb-1">
            <BarChart3 className="h-3 w-3" />
            Wochenbericht
          </p>
          <p className="text-sm font-bold text-white tabular-nums">{weekly.workouts}× Training</p>
          <p className="text-[10px] text-zinc-500 tabular-nums line-clamp-2">
            {weekly.weightChangeKg != null && (
              <>
                {weekly.weightChangeKg > 0 ? "+" : ""}
                {weekly.weightChangeKg} kg ·{" "}
              </>
            )}
            {weekly.totalSteps.toLocaleString("de-AT")} Schritte
            {weekly.avgSleepHours != null && ` · Ø ${weekly.avgSleepHours}h Schlaf`}
          </p>
          <p className="text-[10px] text-accent mt-0.5 truncate">
            {weekly.goalReached ? "Ziel erreicht" : weekly.summaryLine}
          </p>
        </Link>
      )}
    </div>
  );
}
