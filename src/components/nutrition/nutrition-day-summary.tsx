"use client";

import { memo } from "react";
import type { NutritionDashboardPayload } from "@/lib/nutrition-defaults";
import { hasNutritionTargets } from "@/lib/nutrition-defaults";
import { PremiumCard } from "@/components/ui/premium-card";
import { MEAL_TYPE_LABELS } from "@/lib/meal-types";

/** Compact end-of-day summary under meals — Apple Fitness style. */
export const NutritionDaySummary = memo(function NutritionDaySummary({
  dashboard,
}: {
  dashboard: NutritionDashboardPayload;
}) {
  if (!hasNutritionTargets(dashboard)) return null;

  const { consumed, targets, remaining, mealsByType, water } = dashboard;

  const mealCounts = mealsByType.map((slot) => ({
    type: slot.mealType,
    label: MEAL_TYPE_LABELS[slot.mealType],
    items: slot.items.length,
    kcal: Math.round(slot.totals.calories),
  }));

  const loggedMeals = mealCounts.filter((m) => m.items > 0).length;
  const caloriePct = targets.calories
    ? Math.min(100, Math.round((consumed.calories / targets.calories) * 100))
    : 0;

  return (
    <PremiumCard className="space-y-4">
      <div>
        <h2 className="text-xs font-bold text-zinc-500 uppercase tracking-[0.15em]">
          Tageszusammenfassung
        </h2>
        <p className="text-sm text-zinc-300 mt-1">
          {loggedMeals} von {mealCounts.length} Mahlzeiten · {caloriePct}% des
          Kalorienziels
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 text-sm">
        <div>
          <p className="text-[10px] text-zinc-500 uppercase">Verbraucht</p>
          <p className="font-semibold text-white tabular-nums">
            {Math.round(consumed.calories).toLocaleString("de-DE")} kcal
          </p>
        </div>
        <div>
          <p className="text-[10px] text-zinc-500 uppercase">Übrig</p>
          <p className="font-semibold text-accent tabular-nums">
            {Math.round(remaining.calories).toLocaleString("de-DE")} kcal
          </p>
        </div>
        <div>
          <p className="text-[10px] text-zinc-500 uppercase">Protein</p>
          <p className="font-medium text-zinc-200 tabular-nums">
            {Math.round(consumed.proteinG)} / {Math.round(targets.proteinG)} g
          </p>
        </div>
        <div>
          <p className="text-[10px] text-zinc-500 uppercase">Wasser</p>
          <p className="font-medium text-zinc-200 tabular-nums">
            {Math.round(water.consumedMl)} / {Math.round(water.targetMl)} ml
          </p>
        </div>
      </div>

      <ul className="space-y-1.5 border-t border-white/5 pt-3">
        {mealCounts.map((m) => (
          <li
            key={m.type}
            className="flex items-center justify-between text-xs text-zinc-400"
          >
            <span>{m.label}</span>
            <span className="tabular-nums text-zinc-300">
              {m.items > 0 ? `${m.items} · ${m.kcal} kcal` : "—"}
            </span>
          </li>
        ))}
      </ul>
    </PremiumCard>
  );
});
