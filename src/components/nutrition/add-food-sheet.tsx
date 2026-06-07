"use client";

import { memo, useEffect } from "react";
import { X } from "lucide-react";
import type { MealType } from "@prisma/client";
import type { FoodProduct } from "@/lib/food/food-product-types";
import { ProductSearchPanel } from "@/components/nutrition/product-search-panel";
import { MEAL_TYPE_LABELS } from "@/lib/meal-types";

type Props = {
  open: boolean;
  mealType: MealType;
  favoriteIds: Set<string>;
  quickFoods: FoodProduct[];
  onClose: () => void;
  onQuickAddFood: (
    product: FoodProduct,
    quantityG: number,
    meal: MealType
  ) => Promise<void>;
  onToggleFavorite: (foodItemId: string) => Promise<void>;
};

export const AddFoodSheet = memo(function AddFoodSheet({
  open,
  mealType,
  favoriteIds,
  quickFoods,
  onClose,
  onQuickAddFood,
  onToggleFavorite,
}: Props) {
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end sm:justify-center sm:items-center sm:p-4">
      <button
        type="button"
        className="absolute inset-0 bg-black/75"
        aria-label="Schließen"
        onClick={onClose}
      />
      <div className="relative z-10 w-full max-w-lg max-h-[94dvh] flex flex-col rounded-t-2xl sm:rounded-2xl border border-zinc-700 bg-zinc-950 shadow-2xl">
        <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800 shrink-0">
          <div>
            <p className="text-xs text-zinc-500 uppercase tracking-wide">Lebensmittel</p>
            <h2 className="text-lg font-bold text-white">
              {MEAL_TYPE_LABELS[mealType]} hinzufügen
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-4 pb-8 min-h-0">
          <ProductSearchPanel
            mealType={mealType}
            favoriteIds={favoriteIds}
            onQuickAddFood={onQuickAddFood}
            onToggleFavorite={onToggleFavorite}
            quickFoods={quickFoods}
          />
        </div>
      </div>
    </div>
  );
});
