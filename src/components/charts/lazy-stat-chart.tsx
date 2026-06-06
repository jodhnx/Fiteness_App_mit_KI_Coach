"use client";

import dynamic from "next/dynamic";
import { memo } from "react";

const StatChartInner = dynamic(
  () => import("@/components/charts/stat-chart").then((m) => ({ default: m.StatChart })),
  {
    ssr: false,
    loading: () => (
      <div className="h-[220px] rounded-xl bg-zinc-800/50 animate-pulse border border-white/5" />
    ),
  }
);

export const LazyStatChart = memo(function LazyStatChart(props: {
  data: { label: string; value: number }[];
  color?: string;
  type?: "area" | "bar";
}) {
  return <StatChartInner {...props} />;
});
