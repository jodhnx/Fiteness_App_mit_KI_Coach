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
      <div className="h-[240px] rounded-xl bg-zinc-800/50 animate-pulse border border-white/5" />
    ),
  }
);

export const LazyWeightTrendChart = memo(function LazyWeightTrendChart(props: {
  data: { label: string; value: number; trend: number }[];
}) {
  return <WeightTrendChartInner {...props} />;
});
