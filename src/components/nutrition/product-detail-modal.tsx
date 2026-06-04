"use client";

import { memo, useMemo } from "react";
import { X, Star, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { macrosForQuantity } from "@/lib/food-macros";
import { fmtG, fmtKcal } from "@/lib/format-macros";
import type { FoodProduct } from "@/lib/food/food-product-types";
import type { MealType } from "@prisma/client";
import { MEAL_TYPE_LABELS, MEAL_TYPE_ORDER } from "@/lib/meal-types";

type Props = {
  product: FoodProduct;
  grams: string;
  onGramsChange: (g: string) => void;
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
  grams,
  onGramsChange,
  mealType,
  onMealTypeChange,
  favoriteIds,
  onToggleFavorite,
  onClose,
  onAdd,
  adding,
}: Props) {
  const quantityG = parseFloat(grams) || 0;

  const scaled = useMemo(() => {
    if (quantityG <= 0) {
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
      quantityG
    );
    const fiber =
      product.fiberG != null
        ? Math.round(product.fiberG * (quantityG / 100) * 10) / 10
        : 0;
    return { ...m, fiberG: fiber };
  }, [product, quantityG]);

  const per100 = useMemo(
    () => ({
      calories: product.calories,
      proteinG: product.proteinG,
      carbsG: product.carbsG,
      fatG: product.fatG,
    }),
    [product]
  );

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 p-4">
      <div className="w-full max-w-md rounded-2xl border border-zinc-700 bg-zinc-900 p-5 space-y-4 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-start gap-2">
          <div className="min-w-0">
            <h3 className="text-lg font-semibold text-white truncate">{product.name}</h3>
            {product.brand && <p className="text-sm text-zinc-400">{product.brand}</p>}
          </div>
          <button type="button" onClick={onClose} className="text-zinc-500 shrink-0">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="rounded-xl bg-cyan-500/10 border border-cyan-500/25 p-4">
          <p className="text-xs text-cyan-300/80 mb-2">
            Für {quantityG > 0 ? `${quantityG} g` : "… g"} (Basis: 100 g)
          </p>
          <div className="grid grid-cols-2 gap-3">
            <LiveMacro label="Kalorien" value={`${fmtKcal(scaled.calories)} kcal`} />
            <LiveMacro label="Protein" value={`${fmtG(scaled.proteinG)} g`} />
            <LiveMacro label="Kohlenhydrate" value={`${fmtG(scaled.carbsG)} g`} />
            <LiveMacro label="Fett" value={`${fmtG(scaled.fatG)} g`} />
            {product.fiberG != null && (
              <LiveMacro label="Ballaststoffe" value={`${fmtG(scaled.fiberG)} g`} />
            )}
          </div>
        </div>

        <p className="text-[11px] text-zinc-500 text-center">
          pro 100 g: {fmtKcal(per100.calories)} kcal · {fmtG(per100.proteinG)} g P ·{" "}
          {fmtG(per100.carbsG)} g KH · {fmtG(per100.fatG)} g F
        </p>

        <div>
          <label className="text-xs text-zinc-500">Gramm</label>
          <Input
            type="number"
            inputMode="decimal"
            value={grams}
            onChange={(e) => onGramsChange(e.target.value)}
            className="mt-1 bg-zinc-800 border-zinc-700 text-lg font-semibold"
          />
          <div className="flex flex-wrap gap-2 mt-2">
            {[
              { label: "+50 g", delta: 50 },
              { label: "+100 g", delta: 100 },
              { label: "1 Portion", delta: null as number | null },
            ].map((p) => (
              <button
                key={p.label}
                type="button"
                onClick={() => {
                  if (p.delta == null) {
                    onGramsChange(String(product.servingG || 100));
                  } else {
                    const cur = parseFloat(grams) || 0;
                    onGramsChange(String(Math.round(cur + p.delta)));
                  }
                }}
                className="text-xs rounded-full bg-zinc-800 px-3 py-1.5 text-zinc-200 border border-zinc-600 hover:border-cyan-500/50"
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
              className={`text-xs rounded-full px-2.5 py-1 ${
                mealType === m ? "bg-cyan-500 text-zinc-950" : "bg-zinc-800 text-zinc-400"
              }`}
            >
              {MEAL_TYPE_LABELS[m]}
            </button>
          ))}
        </div>

        {product.id && (
          <button
            type="button"
            onClick={() => product.id && onToggleFavorite(product.id)}
            className="flex items-center gap-2 text-sm text-zinc-400"
          >
            <Star
              className={`h-4 w-4 ${
                product.id && favoriteIds.has(product.id)
                  ? "fill-amber-400 text-amber-400"
                  : ""
              }`}
            />
            Favorit
          </button>
        )}

        <Button
          className="w-full h-12 text-base"
          disabled={adding || quantityG <= 0}
          onClick={() => onAdd(quantityG, mealType)}
        >
          <Plus className="h-5 w-5 mr-1" />
          Hinzufügen
        </Button>
      </div>
    </div>
  );
});

function LiveMacro({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[10px] uppercase tracking-wide text-zinc-500">{label}</p>
      <p className="text-lg font-bold text-white tabular-nums">{value}</p>
    </div>
  );
}
