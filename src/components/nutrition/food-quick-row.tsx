"use client";

import { memo } from "react";
import { Plus, Star } from "lucide-react";
import type { FoodProduct } from "@/lib/food/food-product-types";

type Props = {
  food: FoodProduct;
  isFavorite?: boolean;
  onQuickAdd: () => void;
  onOpenDetail: () => void;
  onToggleFavorite?: () => void;
  quickAdding?: boolean;
};

export const FoodQuickRow = memo(function FoodQuickRow({
  food,
  isFavorite,
  onQuickAdd,
  onOpenDetail,
  onToggleFavorite,
  quickAdding,
}: Props) {
  const kcal100 = Math.round(food.calories);

  return (
    <div className="flex items-center gap-1.5 min-h-[56px]">
      <button
        type="button"
        onClick={onOpenDetail}
        className="flex-1 min-w-0 text-left py-2 active:opacity-80"
      >
        <p className="font-medium text-white text-[15px] leading-tight truncate">
          {food.name}
        </p>
        <p className="text-xs text-zinc-500 mt-0.5 tabular-nums">
          {kcal100} kcal pro 100g
        </p>
      </button>

      {onToggleFavorite && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onToggleFavorite();
          }}
          className="flex h-10 w-10 shrink-0 items-center justify-center text-zinc-500 active:opacity-80"
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
        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-cyan-500 text-zinc-950 active:opacity-80 disabled:opacity-50"
        aria-label={`${food.name} hinzufügen`}
      >
        <Plus className="h-6 w-6 stroke-[2.5]" />
      </button>
    </div>
  );
});
