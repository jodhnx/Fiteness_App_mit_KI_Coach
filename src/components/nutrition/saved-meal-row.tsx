"use client";

import { memo } from "react";
import { ChefHat, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import type { SavedMealSummary } from "@/lib/saved-meals-cache";

type Props = {
  meal: SavedMealSummary;
  onAdd: () => void;
  adding?: boolean;
};

export const SavedMealRow = memo(function SavedMealRow({
  meal,
  onAdd,
  adding,
}: Props) {
  const macros = meal.macros?.perServing ?? meal.macros?.total;
  const ingredientCount = meal.ingredients?.length ?? 0;

  return (
    <div className="flex items-stretch gap-2 min-h-[64px] py-2.5 border-b border-violet-500/15 last:border-0">
      <button
        type="button"
        onClick={onAdd}
        disabled={adding}
        className="flex-1 min-w-0 text-left active:opacity-80 disabled:opacity-50"
      >
        <div className="flex items-center gap-1.5">
          <ChefHat className="h-3.5 w-3.5 shrink-0 text-violet-400" aria-hidden />
          <span className="text-[10px] font-semibold uppercase tracking-wide text-violet-300/90">
            Meine Mahlzeit
          </span>
        </div>
        <p className="font-semibold text-white text-[15px] leading-snug truncate mt-0.5">
          {meal.name}
        </p>
        <p className="text-[12px] text-zinc-400 mt-1 tabular-nums leading-tight">
          {macros
            ? `${Math.round(macros.calories)} kcal · ${Math.round(macros.proteinG)} P · ${Math.round(macros.carbsG)} KH · ${Math.round(macros.fatG)} F`
            : "Makros —"}
          {ingredientCount > 0 ? ` · ${ingredientCount} Lebensmittel` : ""}
        </p>
      </button>
      <button
        type="button"
        disabled={adding}
        onClick={onAdd}
        className={cn(
          "shrink-0 self-center flex min-h-11 min-w-[2.75rem] flex-col items-center justify-center rounded-xl border px-1.5 py-1 active:opacity-80 disabled:opacity-50",
          "border-violet-400/35 bg-violet-500/15 text-violet-200"
        )}
        aria-label={`${meal.name} hinzufügen`}
      >
        <Plus className="h-4 w-4 stroke-[2.5]" />
        <span className="mt-0.5 text-[9px] font-semibold leading-none">1×</span>
      </button>
    </div>
  );
});
