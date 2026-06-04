"use client";

import { memo } from "react";
import { Star, Clock, TrendingUp } from "lucide-react";
import type { FoodProduct } from "@/lib/food/food-product-types";
import { fmtKcal } from "@/lib/format-macros";

type Props = {
  title: string;
  icon: "favorites" | "recent" | "frequent";
  foods: FoodProduct[];
  onQuickAdd: (food: FoodProduct) => void;
  onOpen: (food: FoodProduct) => void;
};

export const QuickFoodStrip = memo(function QuickFoodStrip({
  title,
  icon,
  foods,
  onQuickAdd,
  onOpen,
}: Props) {
  if (foods.length === 0) return null;
  const Icon = icon === "favorites" ? Star : icon === "frequent" ? TrendingUp : Clock;

  return (
    <div>
      <p className="text-xs text-zinc-500 mb-2 flex items-center gap-1">
        <Icon className="h-3 w-3" />
        {title}
      </p>
      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
        {foods.map((f) => (
          <div
            key={f.id ?? f.offCode ?? f.name}
            className="shrink-0 flex rounded-xl border border-zinc-700 bg-zinc-800/90 overflow-hidden"
          >
            <button
              type="button"
              onClick={() => onOpen(f)}
              className="px-3 py-2 text-left max-w-[140px]"
            >
              <span className="text-sm font-medium text-white block truncate">{f.name}</span>
              <span className="text-[10px] text-zinc-500">{fmtKcal(f.calories)} kcal/100g</span>
            </button>
            <button
              type="button"
              onClick={() => onQuickAdd(f)}
              className="px-2.5 bg-cyan-500/20 text-cyan-300 hover:bg-cyan-500/40 text-sm font-bold"
            >
              +
            </button>
          </div>
        ))}
      </div>
    </div>
  );
});
