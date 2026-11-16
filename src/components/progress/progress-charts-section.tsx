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

type TrendPoint = { date: string; label: string; value: number };

type Props = {
  nutritionTrend: NutritionPoint[];
  calorieTarget: number;
  proteinTargetG: number;
  weightChartPoints: { label: string; value: number; trend: number }[];
  trainingVolumeTrend: TrendPoint[];
  trainingFrequencyTrend: TrendPoint[];
  /** When false, weight chart is omitted (shown elsewhere on the page). */
  showWeightChart?: boolean;
};

const PERIODS: { id: ChartRange; label: string }[] = [
  { id: "day", label: "Tag" },
  { id: "week", label: "Woche" },
  { id: "month", label: "Monat" },
  { id: "year", label: "Jahr" },
  { id: "all", label: "Gesamt" },
];

function ChartPeriodBar({
  value,
  onChange,
}: {
  value: ChartRange;
  onChange: (r: ChartRange) => void;
}) {
  return (
    <div
      className="grid w-full grid-cols-5 gap-0.5 rounded-lg bg-zinc-100/90 p-0.5 dark:bg-zinc-800/80"
      role="group"
      aria-label="Zeitraum"
    >
      {PERIODS.map((p) => (
        <button
          key={p.id}
          type="button"
          onClick={() => onChange(p.id)}
          className={cn(
            "min-w-0 rounded-md px-0.5 py-1 text-center text-[10px] font-semibold leading-tight tracking-tight transition-colors sm:text-[11px]",
            value === p.id
              ? "bg-white text-zinc-900 shadow-sm dark:bg-zinc-700 dark:text-white"
              : "text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200"
          )}
        >
          {p.label}
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
  trainingVolumeTrend,
  trainingFrequencyTrend,
  showWeightChart = true,
}: Props) {
  const [caloriePeriod, setCaloriePeriod] = useState<ChartRange>("week");
  const [proteinPeriod, setProteinPeriod] = useState<ChartRange>("week");
  const [volumePeriod, setVolumePeriod] = useState<ChartRange>("week");
  const [frequencyPeriod, setFrequencyPeriod] = useState<ChartRange>("week");

  const prefetched = useMemo(() => getPrefetchedCharts(), []);

  const calorieData = useMemo(() => {
    const hit = prefetched?.calories[caloriePeriod];
    if (hit?.length) return hit;
    return aggregateNutrition(nutritionTrend, caloriePeriod, "calories");
  }, [prefetched, nutritionTrend, caloriePeriod]);

  const proteinData = useMemo(() => {
    const hit = prefetched?.protein[proteinPeriod];
    if (hit?.length) return hit;
    return aggregateNutrition(nutritionTrend, proteinPeriod, "proteinG");
  }, [prefetched, nutritionTrend, proteinPeriod]);

  const volumeData = useMemo(() => {
    const hit = prefetched?.volume[volumePeriod];
    if (hit?.length) return hit;
    return aggregateSumByRange(trainingVolumeTrend, volumePeriod);
  }, [prefetched, trainingVolumeTrend, volumePeriod]);

  const frequencyData = useMemo(() => {
    const hit = prefetched?.frequency[frequencyPeriod];
    if (hit?.length) return hit;
    return aggregateSumByRange(trainingFrequencyTrend, frequencyPeriod);
  }, [prefetched, trainingFrequencyTrend, frequencyPeriod]);

  return (
    <div className="space-y-4">
      <div className="card-premium space-y-3 p-4">
        <div className="flex items-center gap-2">
          <Flame className="h-4 w-4 shrink-0 text-orange-400" />
          <h2 className="text-sm font-semibold text-zinc-900 dark:text-white">
            Kalorienverlauf
          </h2>
        </div>
        <ChartPeriodBar value={caloriePeriod} onChange={setCaloriePeriod} />
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

      <div className="card-premium space-y-3 p-4">
        <div className="flex items-center gap-2">
          <Beef className="h-4 w-4 shrink-0 text-rose-400" />
          <h2 className="text-sm font-semibold text-zinc-900 dark:text-white">
            Proteinverlauf
          </h2>
        </div>
        <ChartPeriodBar value={proteinPeriod} onChange={setProteinPeriod} />
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
        <div className="card-premium space-y-3 p-4">
          <h2 className="text-sm font-semibold text-zinc-900 dark:text-white">
            Gewichtsentwicklung
          </h2>
          <LazyWeightTrendChart data={weightChartPoints} />
        </div>
      ) : null}

      <div className="card-premium space-y-3 p-4">
        <div className="flex items-center gap-2">
          <Dumbbell className="h-4 w-4 shrink-0 text-cyan-400" />
          <h2 className="text-sm font-semibold text-zinc-900 dark:text-white">
            Trainingsvolumen
          </h2>
        </div>
        <ChartPeriodBar value={volumePeriod} onChange={setVolumePeriod} />
        {volumeData.length > 0 ? (
          <LazyStatChart data={volumeData} type="bar" color="#22d3ee" />
        ) : (
          <p className="py-4 text-center text-sm text-zinc-500">
            Noch kein Volumen erfasst.
          </p>
        )}
      </div>

      <div className="card-premium space-y-3 p-4">
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4 shrink-0 text-violet-400" />
          <h2 className="text-sm font-semibold text-zinc-900 dark:text-white">
            Trainingshäufigkeit
          </h2>
        </div>
        <ChartPeriodBar value={frequencyPeriod} onChange={setFrequencyPeriod} />
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
