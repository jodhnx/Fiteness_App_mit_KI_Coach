"use client";

import { memo, useMemo, useState } from "react";
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
};

const RANGES: { id: ChartRange; label: string }[] = [
  { id: "day", label: "Tag" },
  { id: "week", label: "Woche" },
  { id: "month", label: "Monat" },
];

const WEIGHT_PERIODS: { id: WeightPeriod; label: string }[] = [
  { id: "7d", label: "7T" },
  { id: "30d", label: "30T" },
  { id: "90d", label: "3M" },
  { id: "180d", label: "6M" },
  { id: "365d", label: "1J" },
  { id: "all", label: "Alle" },
];

function RangeTabs({
  value,
  onChange,
}: {
  value: ChartRange;
  onChange: (v: ChartRange) => void;
}) {
  return (
    <div className="flex gap-1 overflow-x-auto scrollbar-hide">
      {RANGES.map((r) => (
        <button
          key={r.id}
          type="button"
          onClick={() => onChange(r.id)}
          className={cn(
            "shrink-0 rounded-full px-3 py-1 text-xs font-medium",
            value === r.id ? "bg-accent text-zinc-950" : "bg-zinc-800 text-zinc-400"
          )}
        >
          {r.label}
        </button>
      ))}
    </div>
  );
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
}: Props) {
  const [nutRange, setNutRange] = useState<ChartRange>("day");
  const [trainRange, setTrainRange] = useState<ChartRange>("week");

  const prefetched = useMemo(() => getPrefetchedCharts(), []);

  const calorieData = useMemo(() => {
    const hit = prefetched?.calories[nutRange];
    if (hit?.length) return hit;
    return aggregateNutrition(nutritionTrend, nutRange, "calories");
  }, [prefetched, nutritionTrend, nutRange]);

  const proteinData = useMemo(() => {
    const hit = prefetched?.protein[nutRange];
    if (hit?.length) return hit;
    return aggregateNutrition(nutritionTrend, nutRange, "proteinG");
  }, [prefetched, nutritionTrend, nutRange]);

  const volumeData = useMemo(() => {
    const hit = prefetched?.volume[trainRange];
    if (hit?.length) return hit;
    return aggregateSumByRange(trainingVolumeTrend, trainRange);
  }, [prefetched, trainingVolumeTrend, trainRange]);

  const frequencyData = useMemo(() => {
    const hit = prefetched?.frequency[trainRange];
    if (hit?.length) return hit;
    return aggregateSumByRange(trainingFrequencyTrend, trainRange);
  }, [prefetched, trainingFrequencyTrend, trainRange]);

  return (
    <div className="space-y-4">
      <div className="card-premium p-4 space-y-4">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-2">
            <Flame className="h-4 w-4 text-orange-400" />
            <h2 className="text-sm font-semibold text-white">Kalorienverlauf</h2>
          </div>
          <RangeTabs value={nutRange} onChange={setNutRange} />
        </div>
        {calorieTarget > 0 && (
          <p className="text-xs text-zinc-500">Ziel: {calorieTarget} kcal / Tag</p>
        )}
        {calorieData.length > 0 ? (
          <LazyStatChart data={calorieData} type="area" color="#f97316" />
        ) : (
          <p className="text-sm text-zinc-500 py-6 text-center">Noch keine Kaloriendaten.</p>
        )}
      </div>

      <div className="card-premium p-4 space-y-4">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-2">
            <Beef className="h-4 w-4 text-rose-400" />
            <h2 className="text-sm font-semibold text-white">Proteinverlauf</h2>
          </div>
          <RangeTabs value={nutRange} onChange={setNutRange} />
        </div>
        {proteinTargetG > 0 && (
          <p className="text-xs text-zinc-500">Ziel: {proteinTargetG} g / Tag</p>
        )}
        {proteinData.length > 0 ? (
          <LazyStatChart data={proteinData} type="bar" color="#fb7185" />
        ) : (
          <p className="text-sm text-zinc-500 py-6 text-center">Noch keine Proteindaten.</p>
        )}
      </div>

      <div className="card-premium p-4 space-y-3">
        <h2 className="text-sm font-semibold text-white">Gewichtsentwicklung</h2>
        <div className="flex gap-1 overflow-x-auto scrollbar-hide pb-1">
          {WEIGHT_PERIODS.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => onWeightPeriodChange(p.id)}
              className={cn(
                "shrink-0 rounded-full px-3 py-1 text-xs font-medium",
                weightPeriod === p.id ? "bg-accent text-zinc-950" : "bg-zinc-800 text-zinc-400"
              )}
            >
              {p.label}
            </button>
          ))}
        </div>
        <LazyWeightTrendChart data={weightChartPoints} />
      </div>

      <div className="card-premium p-4 space-y-4">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-2">
            <Dumbbell className="h-4 w-4 text-cyan-400" />
            <h2 className="text-sm font-semibold text-white">Trainingsvolumen</h2>
          </div>
          <RangeTabs value={trainRange} onChange={setTrainRange} />
        </div>
        {volumeData.length > 0 ? (
          <LazyStatChart data={volumeData} type="bar" color="#22d3ee" />
        ) : (
          <p className="text-sm text-zinc-500 py-4 text-center">Noch kein Volumen erfasst.</p>
        )}
      </div>

      <div className="card-premium p-4 space-y-4">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-violet-400" />
            <h2 className="text-sm font-semibold text-white">Trainingshäufigkeit</h2>
          </div>
          <RangeTabs value={trainRange} onChange={setTrainRange} />
        </div>
        {frequencyData.length > 0 ? (
          <LazyStatChart data={frequencyData} type="area" color="#a78bfa" />
        ) : (
          <p className="text-sm text-zinc-500 py-4 text-center">Noch keine Workouts.</p>
        )}
      </div>
    </div>
  );
});
