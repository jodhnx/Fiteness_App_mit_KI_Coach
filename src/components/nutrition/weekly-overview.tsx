"use client";

import { memo } from "react";
import { LazyStatChart } from "@/components/charts/lazy-stat-chart";

type Props = {
  averages: { calories: number; proteinG: number; carbsG: number; fatG: number };
  days: { label: string; calories: number }[];
};

export const WeeklyOverview = memo(function WeeklyOverview({ averages, days }: Props) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Ø Kalorien", value: averages.calories, unit: "kcal" },
          { label: "Ø Protein", value: averages.proteinG, unit: "g" },
          { label: "Ø Kohlenhydrate", value: averages.carbsG, unit: "g" },
          { label: "Ø Fett", value: averages.fatG, unit: "g" },
        ].map((s) => (
          <div
            key={s.label}
            className="rounded-xl bg-zinc-900/80 border border-zinc-800 p-3 text-center"
          >
            <p className="text-2xl font-bold text-white">{s.value}</p>
            <p className="text-xs text-zinc-500">{s.label}</p>
          </div>
        ))}
      </div>
      <LazyStatChart
        data={days.map((d) => ({ label: d.label, value: d.calories }))}
        type="bar"
        color="#22d3ee"
      />
    </div>
  );
});
