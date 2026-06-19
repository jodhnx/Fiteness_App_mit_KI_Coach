"use client";

import { memo } from "react";
import Link from "next/link";
import { HeartPulse, BarChart3 } from "lucide-react";
import type { HomeDataPayload } from "@/lib/home-defaults";

export const HomeInsightCards = memo(function HomeInsightCards({
  home,
}: {
  home: HomeDataPayload;
}) {
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
          prefetch
          className="rounded-2xl border border-emerald-500/20 bg-emerald-950/20 p-3 min-h-[5.5rem] active:scale-[0.98] transition-transform"
        >
          <p className="text-[10px] font-semibold uppercase tracking-wide text-emerald-300/90 flex items-center gap-1 mb-2">
            <HeartPulse className="h-3.5 w-3.5" />
            Regeneration
          </p>
          <div className="space-y-1">
            {recovery.slice(0, 3).map((m) => (
              <div key={m.label} className="flex justify-between gap-1 text-xs">
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
          prefetch
          className="rounded-2xl border border-violet-500/20 bg-violet-950/20 p-3 min-h-[5.5rem] active:scale-[0.98] transition-transform"
        >
          <p className="text-[10px] font-semibold uppercase tracking-wide text-violet-300/90 flex items-center gap-1 mb-1">
            <BarChart3 className="h-3.5 w-3.5" />
            Wochenbericht
          </p>
          <p className="text-base font-bold text-white tabular-nums">{weekly.workouts}× Training</p>
          <p className="text-[10px] text-zinc-500 tabular-nums line-clamp-2">
            {weekly.weightChangeKg != null && (
              <>
                {weekly.weightChangeKg > 0 ? "+" : ""}
                {weekly.weightChangeKg} kg ·{" "}
              </>
            )}
            {weekly.totalSteps.toLocaleString("de-AT")} Schritte
          </p>
        </Link>
      )}
    </div>
  );
});
