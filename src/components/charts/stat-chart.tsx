"use client";

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
} from "recharts";

type ChartProps = {
  data: { label: string; value: number }[];
  color?: string;
  type?: "area" | "bar";
};

export function StatChart({ data, color = "var(--accent)", type = "area" }: ChartProps) {
  if (data.length === 0) {
    return (
      <div className="flex h-48 items-center justify-center text-zinc-500 text-sm">
        Noch keine Daten vorhanden
      </div>
    );
  }

  const Chart = type === "bar" ? BarChart : AreaChart;
  const Child = type === "bar" ? Bar : Area;

  return (
    <ResponsiveContainer width="100%" height={220}>
      <Chart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
        <XAxis dataKey="label" stroke="#71717a" fontSize={12} />
        <YAxis stroke="#71717a" fontSize={12} />
        <Tooltip
          contentStyle={{
            background: "#18181b",
            border: "1px solid #3f3f46",
            borderRadius: "8px",
          }}
        />
        {type === "bar" ? (
          <Bar dataKey="value" fill={color} radius={[6, 6, 0, 0]} />
        ) : (
          <Area
            type="monotone"
            dataKey="value"
            stroke={color}
            fill={color}
            fillOpacity={0.2}
            strokeWidth={2}
          />
        )}
      </Chart>
    </ResponsiveContainer>
  );
}
