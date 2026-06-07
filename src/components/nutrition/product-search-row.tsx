"use client";

import { memo } from "react";
import { Plus, ChevronRight, Star } from "lucide-react";
import type { FoodProduct } from "@/lib/food/food-product-types";
import { fmtG, fmtKcal } from "@/lib/format-macros";
import { getDefaultQuickAddGrams } from "@/lib/food/portion-presets";

type Props = {
  food: FoodProduct;
  isFavorite: boolean;
  onQuickAdd: () => void;
  onDetails: () => void;
  onToggleFavorite?: () => void;
  quickAdding?: boolean;
};

export const ProductSearchRow = memo(function ProductSearchRow({
  food,
  isFavorite,
  onQuickAdd,
  onDetails,
  onToggleFavorite,
  quickAdding,
}: Props) {
  const defaultG = getDefaultQuickAddGrams(food);

  return (
    <div className="flex items-center gap-1.5 rounded-xl border border-zinc-800 bg-zinc-900/80 px-2.5 py-2 hover:border-zinc-600 transition-colors">
      <button
        type="button"
        onClick={onDetails}
        className="flex-1 min-w-0 text-left py-1 pl-1"
      >
        <p className="font-medium text-white truncate text-sm leading-tight">{food.name}</p>
        <p className="text-xs text-zinc-500 mt-0.5 tabular-nums">
          {fmtKcal(food.calories)} kcal/100g · {fmtG(food.proteinG)} g Protein
          {food.brand ? (
            <span className="text-zinc-600"> · {food.brand}</span>
          ) : null}
        </p>
      </button>

      {onToggleFavorite && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onToggleFavorite();
          }}
          className="p-2 text-zinc-600 hover:text-amber-400 shrink-0 min-h-[44px] min-w-[44px] flex items-center justify-center"
          title="Favorit"
          aria-label="Favorit"
        >
          <Star
            className={`h-5 w-5 ${isFavorite ? "fill-amber-400 text-amber-400" : ""}`}
          />
        </button>
      )}

      <button
        type="button"
        disabled={quickAdding}
        onClick={(e) => {
          e.stopPropagation();
          onQuickAdd();
        }}
        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-cyan-500 text-zinc-950 hover:bg-cyan-400 active:scale-95 transition-transform disabled:opacity-50"
        title={`Schnell hinzufügen (${defaultG} g)`}
        aria-label={`Schnell hinzufügen ${defaultG} Gramm`}
      >
        <Plus className="h-6 w-6 stroke-[2.5]" />
      </button>

      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onDetails();
        }}
        className="p-2 rounded-lg text-zinc-500 hover:bg-zinc-800 shrink-0 min-h-[44px] min-w-[40px] flex items-center justify-center"
        title="Details"
        aria-label="Details"
      >
        <ChevronRight className="h-5 w-5" />
      </button>
    </div>
  );
});
