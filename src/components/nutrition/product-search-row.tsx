"use client";

import { memo } from "react";
import { Star } from "lucide-react";
import type { FoodProduct } from "@/lib/food/food-product-types";
import { macrosForQuantity } from "@/lib/food-macros";
import { getDefaultQuickAddGrams } from "@/lib/food/portion-presets";
import { brandDefaultServingG } from "@/data/brand-restaurant-foods";

type Props = {
  food: FoodProduct;
  isFavorite: boolean;
  onQuickAdd: () => void;
  onDetails: () => void;
  onToggleFavorite?: () => void;
  quickAdding?: boolean;
};

function brandLine(food: FoodProduct): string | null {
  const brand = food.brand?.trim();
  if (!brand) return null;
  if (brand === "Standardgericht" || brand === "Standardlebensmittel") return "Standard";
  return brand;
}

function portionChip(food: FoodProduct, grams: number): string {
  if (food.servingLabel?.trim()) return food.servingLabel.trim();
  const brandG = brandDefaultServingG(food);
  if (brandG != null && Math.abs(brandG - grams) < 2) {
    if (food.name.toLowerCase().includes("burger")) return "1 Burger";
    return "1 Portion";
  }
  if (grams === 100) return "100 g";
  return `${grams} g`;
}

export const ProductSearchRow = memo(function ProductSearchRow({
  food,
  isFavorite,
  onQuickAdd,
  onDetails,
  onToggleFavorite,
  quickAdding,
}: Props) {
  const grams = getDefaultQuickAddGrams(food);
  const macros = macrosForQuantity(
    {
      calories: food.calories,
      proteinG: food.proteinG,
      carbsG: food.carbsG,
      fatG: food.fatG,
      servingG: food.servingG || 100,
    },
    grams
  );
  const brand = brandLine(food);
  const chip = portionChip(food, grams);

  return (
    <div className="flex items-stretch gap-2 rounded-2xl border border-white/[0.06] bg-zinc-900/50 px-3 py-2.5">
      <button
        type="button"
        onClick={onDetails}
        className="flex-1 min-w-0 text-left"
      >
        <p className="font-semibold text-white truncate text-[15px] leading-snug">
          {food.name}
        </p>
        {brand && (
          <p className="text-[12px] text-zinc-500 mt-0.5 truncate">{brand}</p>
        )}
        <p className="text-[12px] text-zinc-400 mt-1 tabular-nums">
          {Math.round(macros.calories)} kcal · {Math.round(macros.proteinG)} P ·{" "}
          {Math.round(macros.carbsG)} C · {Math.round(macros.fatG)} F
        </p>
      </button>

      {onToggleFavorite && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onToggleFavorite();
          }}
          className="p-2 text-zinc-600 hover:text-amber-400 shrink-0 self-center min-h-[44px] min-w-[40px] flex items-center justify-center"
          aria-label="Favorit"
        >
          <Star
            className={`h-4 w-4 ${isFavorite ? "fill-amber-400 text-amber-400" : ""}`}
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
        className="shrink-0 self-center rounded-xl border border-accent/30 bg-accent/10 px-2.5 py-2 text-[11px] font-bold text-accent min-w-[4.5rem] text-center disabled:opacity-50"
        aria-label={`Schnell hinzufügen ${chip}`}
      >
        {chip}
        <span className="block text-[10px] text-accent/70 mt-0.5">→</span>
      </button>
    </div>
  );
});
