"use client";

import dynamic from "next/dynamic";
import { memo } from "react";

const StatChartInner = dynamic(
  () => import("@/components/charts/stat-chart").then((m) => ({ default: m.StatChart })),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-[220px] items-center justify-center text-zinc-600 text-xs" />
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
