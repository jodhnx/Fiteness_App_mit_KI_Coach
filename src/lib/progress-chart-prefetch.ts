import { getCached, setCached } from "@/lib/client-cache";
import { PROGRESS_CACHE_KEY } from "@/lib/progress-cache";
import type { ProgressChartPrefetchResult } from "@/workers/progress-chart.worker";

export const PROGRESS_CHARTS_CACHE_KEY = "progress-charts-computed";

type ProgressPayload = {
  dashboard?: {
    nutritionTrend: { date: string; label: string; calories: number; proteinG: number }[];
    trainingVolumeTrend: { date: string; label: string; value: number }[];
    trainingFrequencyTrend: { date: string; label: string; value: number }[];
  } | null;
};

let worker: Worker | null = null;
let inflight: Promise<ProgressChartPrefetchResult | null> | null = null;

function getWorker(): Worker | null {
  if (typeof window === "undefined") return null;
  if (worker) return worker;
  try {
    worker = new Worker(
      new URL("../workers/progress-chart.worker.ts", import.meta.url),
      { type: "module" }
    );
    return worker;
  } catch {
    return null;
  }
}

/** Precompute chart series in a Web Worker for instant Progress tab open. */
export function prefetchProgressCharts(force = false): Promise<ProgressChartPrefetchResult | null> {
  if (!force && getCached<ProgressChartPrefetchResult>(PROGRESS_CHARTS_CACHE_KEY)) {
    return Promise.resolve(getCached<ProgressChartPrefetchResult>(PROGRESS_CHARTS_CACHE_KEY));
  }

  if (inflight) return inflight;

  const progress = getCached<ProgressPayload>(PROGRESS_CACHE_KEY);
  const dashboard = progress?.dashboard;
  if (!dashboard?.nutritionTrend?.length && !dashboard?.trainingVolumeTrend?.length) {
    return Promise.resolve(null);
  }

  const w = getWorker();
  if (!w) return Promise.resolve(null);

  inflight = new Promise((resolve) => {
    const onMessage = (event: MessageEvent<ProgressChartPrefetchResult>) => {
      w.removeEventListener("message", onMessage);
      setCached(PROGRESS_CHARTS_CACHE_KEY, event.data, 180_000);
      inflight = null;
      resolve(event.data);
    };
    w.addEventListener("message", onMessage);
    w.postMessage({
      nutritionTrend: dashboard.nutritionTrend ?? [],
      trainingVolumeTrend: dashboard.trainingVolumeTrend ?? [],
      trainingFrequencyTrend: dashboard.trainingFrequencyTrend ?? [],
    });
  });

  return inflight;
}

export function getPrefetchedCharts(): ProgressChartPrefetchResult | null {
  return getCached<ProgressChartPrefetchResult>(PROGRESS_CHARTS_CACHE_KEY);
}
