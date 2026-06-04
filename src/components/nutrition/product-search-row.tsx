"use client";

import { memo } from "react";
import { Plus, ChevronRight, Star } from "lucide-react";
import type { FoodProduct } from "@/lib/food/food-product-types";
import { fmtG, fmtKcal } from "@/lib/format-macros";

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
  return (
    <div className="flex items-center gap-2 rounded-xl border border-zinc-800 bg-zinc-900/80 px-3 py-2.5 hover:border-zinc-600 transition-colors">
      <button
        type="button"
        onClick={onDetails}
        className="flex-1 min-w-0 text-left"
      >
        <p className="font-medium text-white truncate text-sm leading-tight">{food.name}</p>
        <p className="text-xs text-zinc-500 mt-0.5 tabular-nums">
          {fmtKcal(food.calories)} kcal
          <span className="text-zinc-600"> /100g · </span>
          {fmtG(food.proteinG)} g Protein
          {food.brand ? (
            <span className="text-zinc-600 truncate"> · {food.brand}</span>
          ) : null}
        </p>
      </button>

      {onToggleFavorite && food.id && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onToggleFavorite();
          }}
          className="p-1 text-zinc-600 hover:text-amber-400 shrink-0"
        >
          <Star
            className={`h-4 w-4 ${isFavorite ? "fill-amber-400 text-amber-400" : ""}`}
          />
        </button>
      )}

      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onDetails();
        }}
        className="p-2 rounded-lg text-zinc-500 hover:bg-zinc-800 shrink-0"
        title="Details"
      >
        <ChevronRight className="h-5 w-5" />
      </button>

      <button
        type="button"
        disabled={quickAdding}
        onClick={(e) => {
          e.stopPropagation();
          onQuickAdd();
        }}
        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-cyan-500 text-zinc-950 hover:bg-cyan-400 active:scale-95 transition-transform disabled:opacity-50"
        title="Sofort 100 g hinzufügen"
      >
        <Plus className="h-6 w-6 stroke-[2.5]" />
      </button>
    </div>
  );
});
