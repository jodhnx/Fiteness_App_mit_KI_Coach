"use client";

import { memo } from "react";
import Link from "next/link";
import type { HomeDataPayload } from "@/lib/home-defaults";
import { TrendingDown, TrendingUp, Minus, Scale } from "lucide-react";
import { cn } from "@/lib/utils";

export const HomeWeightTrendCard = memo(function HomeWeightTrendCard({
  home,
}: {
  home: HomeDataPayload;
}) {
  const body = home.bodyTransformation;
  const weightChange = home.weeklyReport?.weightChangeKg ?? null;
  const currentKg = body?.currentKg ?? home.weightKg;
  const targetKg = body?.targetKg ?? home.weightGoal?.targetKg ?? null;

  const WeightIcon =
    weightChange == null ? Minus : weightChange < 0 ? TrendingDown : weightChange > 0 ? TrendingUp : Minus;

  const trendLabel =
    weightChange != null
      ? `${weightChange > 0 ? "+" : ""}${weightChange.toLocaleString("de-DE", { maximumFractionDigits: 1 })} kg`
      : "—";

  return (
    <Link
      href="/progress"
      prefetch
      className="flex items-center gap-4 rounded-2xl border border-zinc-800 bg-zinc-900/70 p-4 active:scale-[0.995] transition-transform"
    >
      <div className="h-12 w-12 rounded-2xl bg-violet-500/15 flex items-center justify-center shrink-0">
        <Scale className="h-6 w-6 text-violet-400" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
          Gewichtsentwicklung
        </p>
        <p className="text-2xl font-bold text-white tabular-nums mt-0.5">
          {currentKg != null
            ? `${currentKg.toLocaleString("de-DE", { maximumFractionDigits: 1 })} kg`
            : "—"}
        </p>
        <div className="flex items-center gap-2 mt-1 text-xs text-zinc-500">
          <WeightIcon
            className={cn(
              "h-3.5 w-3.5",
              weightChange == null
                ? "text-zinc-600"
                : weightChange <= 0
                  ? "text-emerald-400"
                  : "text-rose-400"
            )}
          />
          <span>{weightChange != null ? `${trendLabel} · 7 Tage` : "Noch kein Trend"}</span>
          {targetKg != null && (
            <span className="text-zinc-600">· Ziel {targetKg.toFixed(1)} kg</span>
          )}
        </div>
        {body && body.progressPercent > 0 && (
          <div className="mt-2 h-1 rounded-full bg-zinc-800 overflow-hidden">
            <div
              className="h-full rounded-full bg-violet-400"
              style={{ width: `${Math.min(100, body.progressPercent)}%` }}
            />
          </div>
        )}
      </div>
    </Link>
  );
});
