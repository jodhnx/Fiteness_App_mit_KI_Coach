"use client";

import Link from "next/link";
import { Sparkles, ChevronRight } from "lucide-react";
import type { WeeklyReport } from "@/lib/weekly-report";

export function WeeklyReportCard({ report }: { report: WeeklyReport }) {
  const weightStr =
    report.weightChangeKg != null
      ? `${report.weightChangeKg > 0 ? "+" : ""}${report.weightChangeKg} kg`
      : "—";

  return (
    <Link
      href="/progress"
      className="block card-premium p-4 hover:border-violet-500/30 active:opacity-95"
    >
      <div className="flex items-center justify-between gap-2 mb-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-violet-300 flex items-center gap-1">
          <Sparkles className="h-3.5 w-3.5" />
          KI Wochenbericht · {report.weekLabel}
        </p>
        <ChevronRight className="h-4 w-4 text-zinc-600" />
      </div>
      <p className="text-[10px] text-zinc-500 mb-2">Stand {report.generatedAt}</p>
      <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm text-zinc-200 tabular-nums">
        <span>{weightStr}</span>
        <span>{report.workouts} Trainings</span>
        <span>Ø {report.avgProteinG}g Protein</span>
        <span>{report.totalSteps.toLocaleString("de-AT")} Schritte</span>
        {report.avgSleepHours != null && (
          <span>{report.avgSleepHours}h Ø Schlaf</span>
        )}
        <span>Ø {report.avgCaloriesKcal} kcal</span>
        {report.activityCount > 0 && <span>{report.activityCount} Aktivitäten</span>}
      </div>
      <p className="text-xs text-accent mt-2 font-medium">
        {report.goalReached ? "Ziel erreicht" : report.summaryLine}
      </p>
      <p className="text-xs text-zinc-400 mt-2 leading-relaxed line-clamp-3">{report.aiSummary}</p>
    </Link>
  );
}
