"use client";

import { memo } from "react";
import type { NutritionDashboardPayload } from "@/lib/nutrition-defaults";
import { hasNutritionTargets } from "@/lib/nutrition-defaults";

/** Slim daily snapshot — meals already shown as chips above. */
export const NutritionDaySummary = memo(function NutritionDaySummary({
  dashboard,
}: {
  dashboard: NutritionDashboardPayload | null | undefined;
}) {
  if (!dashboard || !hasNutritionTargets(dashboard)) return null;

  const consumed = dashboard.consumed ?? { calories: 0 };
  const targets = dashboard.targets ?? { calories: 0 };
  const remaining = dashboard.remaining ?? { calories: 0 };
  const water = dashboard.water ?? { consumedMl: 0, targetMl: 2500 };
  const mealsByType = Array.isArray(dashboard.mealsByType) ? dashboard.mealsByType : [];
  const logged = mealsByType.filter((m) => (m.items?.length ?? 0) > 0).length;
  const total = mealsByType.length;
  const caloriePct = targets.calories
    ? Math.min(100, Math.round((consumed.calories / targets.calories) * 100))
    : 0;
  const over = Math.max(0, Math.round(consumed.calories - targets.calories));

  return (
    <div className="rounded-2xl border border-white/[0.07] bg-zinc-900/60 px-3.5 py-3 space-y-2">
      <div className="flex items-center justify-between gap-2">
        <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-[0.14em]">
          Übersicht
        </p>
        <p className="text-[11px] text-zinc-400 tabular-nums">
          {logged}/{total} Mahlzeiten · {caloriePct}%
        </p>
      </div>
      <div className="grid grid-cols-3 gap-2 text-center">
        <div>
          <p className="text-[9px] text-zinc-500 uppercase">Gegessen</p>
          <p className="text-sm font-semibold text-white tabular-nums">
            {Math.round(consumed.calories).toLocaleString("de-DE")}
          </p>
        </div>
        <div>
          <p className="text-[9px] text-zinc-500 uppercase">
            {over > 0 ? "Über" : "Übrig"}
          </p>
          <p
            className={`text-sm font-semibold tabular-nums ${
              over > 0 ? "text-red-400" : "text-accent"
            }`}
          >
            {over > 0
              ? `+${over}`
              : Math.round(remaining.calories).toLocaleString("de-DE")}
          </p>
        </div>
        <div>
          <p className="text-[9px] text-zinc-500 uppercase">Wasser</p>
          <p className="text-sm font-semibold text-white tabular-nums">
            {Math.round(water.consumedMl / 100) / 10}l
          </p>
        </div>
      </div>
    </div>
  );
});
