"use client";

import { memo } from "react";
import { Plus } from "lucide-react";
import type { NutritionDashboardPayload } from "@/lib/nutrition-defaults";
import type { MealType } from "@prisma/client";

type Props = {
  dashboard: NutritionDashboardPayload;
  onAddMeal: (meal: MealType) => void;
};

/** First-log CTA when the day has no tracked meals yet. */
export const NutritionEmptyDayBanner = memo(function NutritionEmptyDayBanner({
  dashboard,
  onAddMeal,
}: Props) {
  const meals = dashboard.mealsByType ?? [];
  const hasAnyItem = meals.some((m) => (m.items?.length ?? 0) > 0);
  if (hasAnyItem) return null;

  return (
    <div className="rounded-2xl border border-dashed border-accent/30 bg-accent/5 px-4 py-4 text-center">
      <p className="text-sm font-semibold text-white">Noch nichts getrackt heute</p>
      <p className="text-xs text-zinc-400 mt-1">
        Tippe eine Mahlzeit — Suche, Favoriten oder Quick Add.
      </p>
      <button
        type="button"
        onClick={() => onAddMeal("BREAKFAST")}
        className="mt-3 inline-flex min-h-11 items-center gap-2 rounded-xl bg-accent px-4 text-sm font-semibold text-black active:scale-[0.98] transition-transform"
      >
        <Plus className="h-4 w-4" />
        Erstes Lebensmittel hinzufügen
      </button>
    </div>
  );
});
