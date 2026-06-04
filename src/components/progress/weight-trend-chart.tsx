"use client";

import { memo } from "react";
import {
  ComposedChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";

type Point = { label: string; value: number; trend: number };

export const WeightTrendChart = memo(function WeightTrendChart({
  data,
}: {
  data: Point[];
}) {
  if (data.length === 0) {
    return (
      <div className="flex h-48 items-center justify-center text-zinc-500 text-sm">
        Noch keine Gewichtsdaten
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={220}>
      <ComposedChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
        <XAxis dataKey="label" stroke="#71717a" fontSize={11} tickMargin={4} />
        <YAxis
          stroke="#71717a"
          fontSize={11}
          domain={["auto", "auto"]}
          tickFormatter={(v) => `${v}`}
        />
        <Tooltip
          contentStyle={{
            background: "#18181b",
            border: "1px solid #3f3f46",
            borderRadius: "8px",
            fontSize: 12,
          }}
          formatter={(value, name) => [
            `${value} kg`,
            name === "trend" ? "Trend" : "Gewicht",
          ] as [string, string]}
        />
        <Legend wrapperStyle={{ fontSize: 11 }} />
        <Line
          type="monotone"
          dataKey="value"
          name="Gewicht"
          stroke="var(--accent)"
          strokeWidth={2}
          dot={{ r: 3, fill: "var(--accent)" }}
          activeDot={{ r: 5 }}
        />
        <Line
          type="monotone"
          dataKey="trend"
          name="Trend"
          stroke="#a78bfa"
          strokeWidth={1.5}
          strokeDasharray="6 4"
          dot={false}
        />
      </ComposedChart>
    </ResponsiveContainer>
  );
});
