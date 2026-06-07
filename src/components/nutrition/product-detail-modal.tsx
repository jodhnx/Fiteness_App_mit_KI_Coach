"use client";

import { memo, useMemo, useEffect, useState } from "react";
import { X, Star, Plus } from "lucide-react";
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

type Props = {
  product: FoodProduct;
  mealType: MealType;
  onMealTypeChange: (m: MealType) => void;
  favoriteIds: Set<string>;
  onToggleFavorite: (id: string) => void;
  onClose: () => void;
  onAdd: (quantityG: number, meal: MealType) => Promise<void>;
  adding?: boolean;
};

export const ProductDetailModal = memo(function ProductDetailModal({
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
  const [selectedGrams, setSelectedGrams] = useState(() => getDefaultPortionGrams(product));

  useEffect(() => {
    setSelectedGrams(getDefaultPortionGrams(product));
  }, [product]);

  const scaled = useMemo(() => {
    if (selectedGrams <= 0) {
      return { calories: 0, proteinG: 0, carbsG: 0, fatG: 0, fiberG: 0 };
    }
    const m = macrosForQuantity(
      {
        calories: product.calories,
        proteinG: product.proteinG,
        carbsG: product.carbsG,
        fatG: product.fatG,
        servingG: product.servingG || 100,
      },
      selectedGrams
    );
    const fiber =
      product.fiberG != null
        ? Math.round(product.fiberG * (selectedGrams / 100) * 10) / 10
        : 0;
    return { ...m, fiberG: fiber };
  }, [product, selectedGrams]);

  return (
    <div className="fixed inset-0 z-[60] flex flex-col justify-end bg-black/70">
      <button type="button" className="flex-1 min-h-0" aria-label="Schließen" onClick={onClose} />
      <div className="relative z-10 w-full max-w-lg mx-auto rounded-t-3xl border-t border-x border-zinc-700 bg-zinc-950 shadow-2xl safe-area-pb">
        <div className="flex justify-center pt-3 pb-1">
          <div className="h-1 w-10 rounded-full bg-zinc-600" />
        </div>

        <div className="px-5 pb-5 space-y-4">
          <div className="flex justify-between items-start gap-3">
            <div className="min-w-0 flex-1">
              <h3 className="text-lg font-bold text-white leading-tight">{product.name}</h3>
              {product.brand && (
                <p className="text-sm text-zinc-400 mt-0.5">{product.brand}</p>
              )}
            </div>
            <button type="button" onClick={onClose} className="p-2 text-zinc-500 shrink-0">
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <MacroTile label="Kalorien" value={`${fmtKcal(scaled.calories)} kcal`} accent />
            <MacroTile label="Protein" value={`${fmtG(scaled.proteinG)} g`} />
            <MacroTile label="Kohlenhydrate" value={`${fmtG(scaled.carbsG)} g`} />
            <MacroTile label="Fett" value={`${fmtG(scaled.fatG)} g`} />
          </div>

          <div>
            <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wide mb-2">
              Portionsgröße
            </p>
            <div className="flex flex-wrap gap-2">
              {presets.map((p) => (
                <button
                  key={p.label}
                  type="button"
                  onClick={() => setSelectedGrams(p.grams)}
                  className={`text-sm rounded-xl px-3.5 py-2.5 border font-medium transition-colors ${
                    selectedGrams === p.grams
                      ? "bg-cyan-500/20 border-cyan-500/50 text-cyan-100"
                      : "bg-zinc-900 border-zinc-700 text-zinc-300 hover:border-zinc-500"
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-wrap gap-1.5">
            {MEAL_TYPE_ORDER.map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => onMealTypeChange(m)}
                className={`text-xs rounded-full px-3 py-1.5 font-medium ${
                  mealType === m
                    ? "bg-cyan-500 text-zinc-950"
                    : "bg-zinc-800 text-zinc-400"
                }`}
              >
                {MEAL_TYPE_LABELS[m]}
              </button>
            ))}
          </div>

          <div className="flex gap-2">
            {product.id && (
              <Button
                type="button"
                variant="outline"
                className="shrink-0"
                onClick={() => product.id && onToggleFavorite(product.id)}
              >
                <Star
                  className={`h-4 w-4 mr-1.5 ${
                    product.id && favoriteIds.has(product.id)
                      ? "fill-amber-400 text-amber-400"
                      : ""
                  }`}
                />
                Favorit
              </Button>
            )}
            <Button
              className="flex-1 h-12 text-base btn-accent"
              disabled={adding || selectedGrams <= 0}
              onClick={() => onAdd(selectedGrams, mealType)}
            >
              <Plus className="h-5 w-5 mr-1.5" />
              Hinzufügen ({selectedGrams} g)
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
});

function MacroTile({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <div
      className={`rounded-xl p-3 border ${
        accent
          ? "bg-cyan-500/10 border-cyan-500/25"
          : "bg-zinc-900/80 border-zinc-800"
      }`}
    >
      <p className="text-[10px] uppercase tracking-wide text-zinc-500">{label}</p>
      <p className="text-lg font-bold text-white tabular-nums mt-0.5">{value}</p>
    </div>
  );
}
