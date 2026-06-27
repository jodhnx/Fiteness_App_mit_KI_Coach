/// <reference lib="webworker" />

import {
  aggregateNutrition,
  aggregateSumByRange,
  type ChartRange,
  type NutritionPoint,
} from "@/lib/progress-chart-utils";

type TrendPoint = { date: string; label: string; value: number };

export type ProgressChartPrefetchInput = {
  nutritionTrend: NutritionPoint[];
  trainingVolumeTrend: TrendPoint[];
  trainingFrequencyTrend: TrendPoint[];
};

export type ProgressChartPrefetchResult = {
  calories: Record<ChartRange, { label: string; value: number }[]>;
  protein: Record<ChartRange, { label: string; value: number }[]>;
  volume: Record<ChartRange, { label: string; value: number }[]>;
  frequency: Record<ChartRange, { label: string; value: number }[]>;
};

const RANGES: ChartRange[] = ["day", "week", "month"];

function computeCharts(input: ProgressChartPrefetchInput): ProgressChartPrefetchResult {
  const calories = {} as ProgressChartPrefetchResult["calories"];
  const protein = {} as ProgressChartPrefetchResult["protein"];
  const volume = {} as ProgressChartPrefetchResult["volume"];
  const frequency = {} as ProgressChartPrefetchResult["frequency"];

  for (const range of RANGES) {
    calories[range] = aggregateNutrition(input.nutritionTrend, range, "calories");
    protein[range] = aggregateNutrition(input.nutritionTrend, range, "proteinG");
    volume[range] = aggregateSumByRange(input.trainingVolumeTrend, range);
    frequency[range] = aggregateSumByRange(input.trainingFrequencyTrend, range);
  }

  return { calories, protein, volume, frequency };
}

self.onmessage = (event: MessageEvent<ProgressChartPrefetchInput>) => {
  const result = computeCharts(event.data);
  self.postMessage(result);
};
