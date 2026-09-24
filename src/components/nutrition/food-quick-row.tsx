"use client";

import { memo } from "react";
import { Star } from "lucide-react";
import type { FoodProduct } from "@/lib/food/food-product-types";
import { macrosPer100g } from "@/lib/food-per-100g";
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

function MacroDot({ color, value }: { color: string; value: string }) {
  return (
    <span className="inline-flex items-center gap-1 tabular-nums">
      <span
        className="inline-block h-1.5 w-1.5 rounded-full shrink-0"
        style={{ background: color }}
        aria-hidden
      />
      {value}
    </span>
  );
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
  const per100 = macrosPer100g({
    calories: food.calories,
    proteinG: food.proteinG,
    carbsG: food.carbsG,
    fatG: food.fatG,
    servingG: food.servingG || 100,
  });
  const brand = brandLine(food);
  const chip = portionChip(food, grams);
  const scale = grams / 100;
  const kcal = Math.round(per100.calories * scale);
  const p = Math.round(per100.proteinG * scale);
  const c = Math.round(per100.carbsG * scale);
  const f = Math.round(per100.fatG * scale);

  return (
    <div className="flex items-center gap-2 min-h-[64px] py-2.5 border-b border-zinc-200/80 last:border-0 dark:border-white/[0.06]">
      <button
        type="button"
        onClick={onOpenDetail}
        className="flex-1 min-w-0 text-left active:opacity-80"
      >
        <p className="font-semibold text-zinc-900 text-[15px] leading-snug truncate dark:text-white">
          {food.name}
        </p>
        <p className="text-[12px] text-zinc-500 mt-0.5 truncate leading-tight">
          {[brand, chip].filter(Boolean).join(" · ") || chip}
        </p>
        <p className="text-[12px] text-zinc-500 mt-1 flex flex-wrap items-center gap-x-2.5 gap-y-0.5 leading-tight dark:text-zinc-400">
          <span className="font-semibold tabular-nums text-zinc-800 dark:text-zinc-200">
            {kcal} kcal
          </span>
          <MacroDot color="var(--nutrition-protein)" value={`${p}g`} />
          <MacroDot color="var(--nutrition-carbs)" value={`${c}g`} />
          <MacroDot color="var(--nutrition-fat)" value={`${f}g`} />
        </p>
      </button>

      {onToggleFavorite && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onToggleFavorite();
          }}
          className="flex h-10 w-8 shrink-0 items-center justify-center self-center text-zinc-500 active:opacity-80"
          aria-label={isFavorite ? "Favorit entfernen" : "Als Favorit merken"}
          aria-pressed={Boolean(isFavorite)}
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
        className="shrink-0 self-center flex h-9 w-9 items-center justify-center rounded-full bg-teal-500/90 text-white active:opacity-80 disabled:opacity-50"
        aria-label={`${food.name} hinzufügen (${chip})`}
      >
        <span className="text-lg font-bold leading-none">+</span>
      </button>
    </div>
  );
});
