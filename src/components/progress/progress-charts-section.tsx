"use client";

import { memo, useMemo } from "react";
import { LazyStatChart } from "@/components/charts/lazy-stat-chart";
import { LazyWeightTrendChart } from "@/components/progress/lazy-weight-trend-chart";
import { Flame, Beef, Dumbbell, Calendar } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  aggregateNutrition,
  aggregateSumByRange,
  type ChartRange,
  type NutritionPoint,
} from "@/lib/progress-chart-utils";
import { getPrefetchedCharts } from "@/lib/progress-chart-prefetch";
import type { WeightPeriod } from "@/lib/weight-analytics";

type TrendPoint = { date: string; label: string; value: number };

type Props = {
  nutritionTrend: NutritionPoint[];
  calorieTarget: number;
  proteinTargetG: number;
  weightChartPoints: { label: string; value: number; trend: number }[];
  weightPeriod: WeightPeriod;
  onWeightPeriodChange: (p: WeightPeriod) => void;
  trainingVolumeTrend: TrendPoint[];
  trainingFrequencyTrend: TrendPoint[];
  /** When false, weight chart is omitted (shown elsewhere on the page). */
  showWeightChart?: boolean;
};

const PERIODS: { id: WeightPeriod; label: string }[] = [
  { id: "7d", label: "Woche" },
  { id: "30d", label: "Monat" },
  { id: "90d", label: "3 Monate" },
  { id: "180d", label: "6 Monate" },
  { id: "365d", label: "Jahr" },
  { id: "all", label: "Gesamt" },
];

/** Map shared weight period → nutrition/training aggregation bucket. */
function chartRangeForPeriod(period: WeightPeriod): ChartRange {
  if (period === "7d") return "day";
  if (period === "30d") return "week";
  return "month";
}

function daysForPeriod(period: WeightPeriod): number | null {
  switch (period) {
    case "7d":
      return 7;
    case "30d":
      return 30;
    case "90d":
      return 90;
    case "180d":
      return 180;
    case "365d":
      return 365;
    default:
      return null;
  }
}

function filterByDays<T extends { date: string }>(
  points: T[],
  period: WeightPeriod
): T[] {
  const days = daysForPeriod(period);
  if (days == null || points.length === 0) return points;
  const cutoff = Date.now() - days * 86_400_000;
  return points.filter((p) => {
    const t = new Date(p.date).getTime();
    return Number.isFinite(t) && t >= cutoff;
  });
}

export const ProgressChartsSection = memo(function ProgressChartsSection({
  nutritionTrend,
  calorieTarget,
  proteinTargetG,
  weightChartPoints,
  weightPeriod,
  onWeightPeriodChange,
  trainingVolumeTrend,
  trainingFrequencyTrend,
  showWeightChart = true,
}: Props) {
  const range = chartRangeForPeriod(weightPeriod);
  const prefetched = useMemo(() => getPrefetchedCharts(), []);

  const nutSlice = useMemo(
    () => filterByDays(nutritionTrend, weightPeriod),
    [nutritionTrend, weightPeriod]
  );
  const volSlice = useMemo(
    () => filterByDays(trainingVolumeTrend, weightPeriod),
    [trainingVolumeTrend, weightPeriod]
  );
  const freqSlice = useMemo(
    () => filterByDays(trainingFrequencyTrend, weightPeriod),
    [trainingFrequencyTrend, weightPeriod]
  );

  const calorieData = useMemo(() => {
    const hit = prefetched?.calories[range];
    if (hit?.length && weightPeriod === "30d" && range === "week") return hit;
    return aggregateNutrition(nutSlice, range, "calories");
  }, [prefetched, nutSlice, range, weightPeriod]);

  const proteinData = useMemo(() => {
    const hit = prefetched?.protein[range];
    if (hit?.length && weightPeriod === "30d" && range === "week") return hit;
    return aggregateNutrition(nutSlice, range, "proteinG");
  }, [prefetched, nutSlice, range, weightPeriod]);

  const volumeData = useMemo(() => {
    return aggregateSumByRange(volSlice, range);
  }, [volSlice, range]);

  const frequencyData = useMemo(() => {
    return aggregateSumByRange(freqSlice, range);
  }, [freqSlice, range]);

  return (
    <div className="space-y-4">
      <div className="card-premium p-3">
        <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-zinc-500">
          Zeitraum für alle Diagramme
        </p>
        <div className="flex gap-1.5 overflow-x-auto scrollbar-hide pb-0.5">
          {PERIODS.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => onWeightPeriodChange(p.id)}
              className={cn(
                "shrink-0 rounded-full px-3.5 py-2 text-xs font-semibold transition-colors",
                weightPeriod === p.id
                  ? "bg-accent text-white"
                  : "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400"
              )}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      <div className="card-premium p-4 space-y-4">
        <div className="flex items-center gap-2">
          <Flame className="h-4 w-4 text-orange-400" />
          <h2 className="text-sm font-semibold text-zinc-900 dark:text-white">
            Kalorienverlauf
          </h2>
        </div>
        {calorieTarget > 0 && (
          <p className="text-xs text-zinc-500">Ziel: {calorieTarget} kcal / Tag</p>
        )}
        {calorieData.length > 0 ? (
          <LazyStatChart data={calorieData} type="area" color="#f97316" />
        ) : (
          <p className="py-6 text-center text-sm text-zinc-500">
            Noch keine Kaloriendaten.
          </p>
        )}
      </div>

      <div className="card-premium p-4 space-y-4">
        <div className="flex items-center gap-2">
          <Beef className="h-4 w-4 text-rose-400" />
          <h2 className="text-sm font-semibold text-zinc-900 dark:text-white">
            Proteinverlauf
          </h2>
        </div>
        {proteinTargetG > 0 && (
          <p className="text-xs text-zinc-500">Ziel: {proteinTargetG} g / Tag</p>
        )}
        {proteinData.length > 0 ? (
          <LazyStatChart data={proteinData} type="bar" color="#fb7185" />
        ) : (
          <p className="py-6 text-center text-sm text-zinc-500">
            Noch keine Proteindaten.
          </p>
        )}
      </div>

      {showWeightChart ? (
        <div className="card-premium p-4 space-y-3">
          <h2 className="text-sm font-semibold text-zinc-900 dark:text-white">
            Gewichtsentwicklung
          </h2>
          <LazyWeightTrendChart data={weightChartPoints} />
        </div>
      ) : null}

      <div className="card-premium p-4 space-y-4">
        <div className="flex items-center gap-2">
          <Dumbbell className="h-4 w-4 text-cyan-400" />
          <h2 className="text-sm font-semibold text-zinc-900 dark:text-white">
            Trainingsvolumen
          </h2>
        </div>
        {volumeData.length > 0 ? (
          <LazyStatChart data={volumeData} type="bar" color="#22d3ee" />
        ) : (
          <p className="py-4 text-center text-sm text-zinc-500">
            Noch kein Volumen erfasst.
          </p>
        )}
      </div>

      <div className="card-premium p-4 space-y-4">
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4 text-violet-400" />
          <h2 className="text-sm font-semibold text-zinc-900 dark:text-white">
            Trainingshäufigkeit
          </h2>
        </div>
        {frequencyData.length > 0 ? (
          <LazyStatChart data={frequencyData} type="area" color="#a78bfa" />
        ) : (
          <p className="py-4 text-center text-sm text-zinc-500">
            Noch keine Workouts.
          </p>
        )}
      </div>
    </div>
  );
});
