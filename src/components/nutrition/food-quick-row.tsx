"use client";

import { memo } from "react";
import { Plus } from "lucide-react";
import type { FoodProduct } from "@/lib/food/food-product-types";
import { getQuickAddDisplay } from "@/lib/food/quick-add-display";

type Props = {
  food: FoodProduct;
  onQuickAdd: () => void;
  onOpenDetail: () => void;
  quickAdding?: boolean;
};

export const FoodQuickRow = memo(function FoodQuickRow({
  food,
  onQuickAdd,
  onOpenDetail,
  quickAdding,
}: Props) {
  const { kcal, portionSuffix } = getQuickAddDisplay(food);

  return (
    <div className="flex items-center gap-2 min-h-[56px]">
      <button
        type="button"
        onClick={onOpenDetail}
        className="flex-1 min-w-0 text-left py-2 active:opacity-80"
      >
        <p className="font-medium text-white text-[15px] leading-tight truncate">
          {food.name}
        </p>
        <p className="text-xs text-zinc-500 mt-0.5 tabular-nums">
          ({kcal} kcal {portionSuffix})
        </p>
      </button>

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
