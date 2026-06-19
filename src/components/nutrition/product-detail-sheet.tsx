"use client";

import { memo, useMemo, useEffect, useState } from "react";
import { Star, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { macrosForQuantity } from "@/lib/food-macros";
import { fmtG, fmtKcal } from "@/lib/format-macros";
import type { FoodProduct } from "@/lib/food/food-product-types";
import type { MealType } from "@prisma/client";
import { MEAL_TYPE_LABELS, MEAL_TYPE_ORDER } from "@/lib/meal-types";
import {
  getPortionPresets,
  getDefaultPortionGrams,
} from "@/lib/food/portion-presets";
import { MobileBottomSheet } from "@/components/ui/mobile-bottom-sheet";

type Props = {
  product: FoodProduct;
  mealType: MealType;
  onMealTypeChange: (m: MealType) => void;
  favoriteIds: Set<string>;
  onToggleFavorite: (id: string) => void;
  onClose: () => void;
  onAdd: (quantityG: number, meal: MealType) => void;
  adding?: boolean;
};

export const ProductDetailSheet = memo(function ProductDetailSheet({
  product,
  mealType,
  onMealTypeChange,
  favoriteIds,
  onToggleFavorite,
  onClose,
  onAdd,
  adding,
}: Props) {
  const presets = useMemo(() => getPortionPresets(product), [product]);
  const [selectedGrams, setSelectedGrams] = useState(() =>
    getDefaultPortionGrams(product)
  );

  useEffect(() => {
    setSelectedGrams(getDefaultPortionGrams(product));
  }, [product]);

  const scaled = useMemo(() => {
    if (selectedGrams <= 0) {
      return { calories: 0, proteinG: 0, carbsG: 0, fatG: 0 };
    }
    return macrosForQuantity(
      {
        calories: product.calories,
        proteinG: product.proteinG,
        carbsG: product.carbsG,
        fatG: product.fatG,
        servingG: product.servingG || 100,
      },
      selectedGrams
    );
  }, [product, selectedGrams]);

  return (
    <MobileBottomSheet
      open
      onClose={onClose}
      title={product.name}
      subtitle={product.brand ?? "Produktdetails"}
      variant="compact"
      layer="detail"
      bodyClassName="mobile-sheet-body--no-scroll"
      headerAction={
        product.id ? (
          <button
            type="button"
            onClick={() => onToggleFavorite(product.id!)}
            className="mobile-sheet-close-btn"
            aria-label="Favorit"
          >
            <Star
              className={`h-5 w-5 ${
                favoriteIds.has(product.id) ? "fill-amber-400 text-amber-400" : "text-zinc-400"
              }`}
            />
          </button>
        ) : undefined
      }
    >
      <div className="space-y-4 pb-1">
        <div className="grid grid-cols-4 gap-2">
          <MacroPill label="kcal" value={fmtKcal(scaled.calories)} highlight />
          <MacroPill label="Protein" value={`${fmtG(scaled.proteinG)}g`} />
          <MacroPill label="Carbs" value={`${fmtG(scaled.carbsG)}g`} />
          <MacroPill label="Fett" value={`${fmtG(scaled.fatG)}g`} />
        </div>

        <div>
          <p className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider mb-2">
            Portion
          </p>
          <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-0.5 -mx-0.5 px-0.5">
            {presets.map((p) => (
              <button
                key={p.label}
                type="button"
                onClick={() => setSelectedGrams(p.grams)}
                className={`shrink-0 rounded-xl px-3.5 py-2.5 text-sm font-medium border transition-all active:scale-[0.98] ${
                  selectedGrams === p.grams
                    ? "bg-cyan-500/25 border-cyan-400/50 text-cyan-50 shadow-[0_0_20px_-4px_rgba(34,211,238,0.35)]"
                    : "bg-zinc-900/80 border-zinc-700 text-zinc-300"
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex gap-1.5 overflow-x-auto scrollbar-hide">
          {MEAL_TYPE_ORDER.map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => onMealTypeChange(m)}
              className={`shrink-0 text-xs rounded-full px-3 py-1.5 font-semibold ${
                mealType === m
                  ? "bg-cyan-500 text-zinc-950"
                  : "bg-zinc-800/90 text-zinc-400 border border-zinc-700"
              }`}
            >
              {MEAL_TYPE_LABELS[m]}
            </button>
          ))}
        </div>

        <Button
          className="w-full h-14 text-base font-bold btn-accent rounded-2xl shadow-lg"
          disabled={adding || selectedGrams <= 0}
          onClick={() => onAdd(selectedGrams, mealType)}
        >
          <Plus className="h-5 w-5 mr-2 stroke-[2.5]" />
          Hinzufügen · {selectedGrams} g
        </Button>
      </div>
    </MobileBottomSheet>
  );
});

function MacroPill({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div
      className={`rounded-xl px-2 py-2.5 text-center border ${
        highlight
          ? "bg-cyan-500/12 border-cyan-500/30"
          : "bg-zinc-900/70 border-zinc-800"
      }`}
    >
      <p className="text-[9px] uppercase tracking-wide text-zinc-500">{label}</p>
      <p className="text-sm font-bold text-white tabular-nums mt-0.5 leading-none">
        {value}
      </p>
    </div>
  );
}
