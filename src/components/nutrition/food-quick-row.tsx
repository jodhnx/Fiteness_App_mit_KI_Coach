"use client";

import { memo } from "react";
import { Star } from "lucide-react";
import type { FoodProduct } from "@/lib/food/food-product-types";
import { macrosForQuantity } from "@/lib/food-macros";
import { getDefaultQuickAddGrams } from "@/lib/food/portion-presets";
import { brandDefaultServingG } from "@/data/brand-restaurant-foods";

type Props = {
  food: FoodProduct;
  isFavorite?: boolean;
  onQuickAdd: () => void;
  onOpenDetail: () => void;
  onToggleFavorite?: () => void;
  quickAdding?: boolean;
};

function brandLine(food: FoodProduct): string | null {
  const brand = food.brand?.trim();
  if (!brand) return null;
  if (brand === "Standardgericht" || brand === "Standardlebensmittel") {
    return "Standard";
  }
  return brand;
}

function portionChip(food: FoodProduct, grams: number): string {
  if (food.servingLabel?.trim()) return food.servingLabel.trim();
  const brandG = brandDefaultServingG(food);
  if (brandG != null && Math.abs(brandG - grams) < 2) {
    const n = food.name.toLowerCase();
    if (n.includes("burger")) return "1 Burger";
    if (n.includes("nugget")) return `${grams} g`;
    return `1 Portion`;
  }
  if (grams === 100) return "100 g";
  return `${grams} g`;
}

export const FoodQuickRow = memo(function FoodQuickRow({
  food,
  isFavorite,
  onQuickAdd,
  onOpenDetail,
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
  const showPer100 = grams === 100 && !food.servingLabel;

  return (
    <div className="flex items-stretch gap-2 min-h-[64px] py-2.5 border-b border-zinc-800/60 last:border-0">
      <button
        type="button"
        onClick={onOpenDetail}
        className="flex-1 min-w-0 text-left active:opacity-80"
      >
        <p className="font-semibold text-white text-[15px] leading-snug truncate">
          {food.name}
        </p>
        {brand && (
          <p className="text-[12px] text-zinc-500 mt-0.5 truncate leading-tight">
            {brand}
          </p>
        )}
        <p className="text-[12px] text-zinc-400 mt-1 tabular-nums leading-tight">
          {Math.round(macros.calories)} kcal
          {showPer100 ? " / 100 g" : ""}
          {" · "}
          {Math.round(macros.proteinG)} P
          {" · "}
          {Math.round(macros.carbsG)} C
          {" · "}
          {Math.round(macros.fatG)} F
        </p>
      </button>

      {onToggleFavorite && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onToggleFavorite();
          }}
          className="flex h-10 w-9 shrink-0 items-center justify-center self-center text-zinc-600 active:opacity-80"
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
        className="shrink-0 self-center flex h-10 w-10 items-center justify-center rounded-xl border border-accent/35 bg-accent/15 text-lg font-bold text-accent active:opacity-80 disabled:opacity-50"
        aria-label={`${food.name} hinzufügen (${chip})`}
      >
        +
      </button>
    </div>
  );
});
