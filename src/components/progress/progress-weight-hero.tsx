"use client";

import { memo } from "react";
import { LazyWeightTrendChart } from "@/components/progress/lazy-weight-trend-chart";
import { cn } from "@/lib/utils";
import type { WeightPeriod } from "@/lib/weight-analytics";

const WEIGHT_PERIODS: { id: WeightPeriod; label: string }[] = [
  { id: "7d", label: "7T" },
  { id: "30d", label: "30T" },
  { id: "90d", label: "3M" },
  { id: "180d", label: "6M" },
  { id: "365d", label: "1J" },
  { id: "all", label: "Alle" },
];

export const ProgressWeightHero = memo(function ProgressWeightHero({
  points,
  period,
  onPeriodChange,
  loading,
  currentKg,
  changeWeekKg,
}: {
  points: { label: string; value: number; trend: number }[];
  period: WeightPeriod;
  onPeriodChange: (p: WeightPeriod) => void;
  loading?: boolean;
  currentKg?: number | null;
  changeWeekKg?: number | null;
}) {
  const showSkeleton = loading && points.length === 0;

  return (
    <section className="card-premium p-3.5 sm:p-4 space-y-3">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h2 className="text-sm font-semibold text-zinc-900 dark:text-white">
            Gewichtsverlauf
          </h2>
          {currentKg != null && (
            <p className="mt-0.5 text-xl font-bold tabular-nums text-accent">
              {currentKg.toLocaleString("de-DE", { minimumFractionDigits: 1 })}{" "}
              <span className="text-xs font-normal text-zinc-500">kg</span>
            </p>
          )}
          {changeWeekKg != null && (
            <p className="text-xs tabular-nums text-zinc-500">
              {changeWeekKg > 0 ? "+" : ""}
              {changeWeekKg.toFixed(1)} kg in 7 Tagen
            </p>
          )}
        </div>
        <div className="flex gap-1 overflow-x-auto scrollbar-hide pb-0.5">
          {WEIGHT_PERIODS.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => onPeriodChange(p.id)}
              className={cn(
                "shrink-0 rounded-full px-2.5 py-1 min-h-8 text-xs font-medium",
                period === p.id
                  ? "bg-accent text-white"
                  : "border border-zinc-200 bg-white text-zinc-600 dark:border-white/10 dark:bg-white/[0.04] dark:text-zinc-400"
              )}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {showSkeleton ? (
        <div
          className="h-[220px] rounded-xl bg-zinc-200/70 animate-pulse border border-zinc-200 dark:bg-white/[0.04] dark:border-white/[0.06]"
          aria-hidden
        />
      ) : points.length > 0 ? (
        <LazyWeightTrendChart data={points} />
      ) : (
        <p className="text-sm text-zinc-500 py-8 text-center">
          Noch keine Gewichtsdaten — trage dein Gewicht ein, um den Verlauf zu
          sehen.
        </p>
      )}
    </section>
  );
});
