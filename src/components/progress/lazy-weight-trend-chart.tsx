"use client";

import dynamic from "next/dynamic";
import { memo } from "react";

const WeightTrendChartInner = dynamic(
  () =>
    import("@/components/progress/weight-trend-chart").then((m) => ({
      default: m.WeightTrendChart,
    })),
  {
    ssr: false,
    loading: () => (
      <div className="h-[220px] rounded-xl bg-zinc-200/70 animate-pulse border border-zinc-200 dark:bg-white/[0.04] dark:border-white/[0.06]" />
    ),
  }
);

export const LazyWeightTrendChart = memo(function LazyWeightTrendChart(props: {
  data: { label: string; value: number; trend: number }[];
}) {
  return <WeightTrendChartInner {...props} />;
});
