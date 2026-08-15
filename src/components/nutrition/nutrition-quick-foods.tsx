"use client";

import { memo } from "react";
import { Star, Clock, TrendingUp } from "lucide-react";
import type { FoodProduct } from "@/lib/food/food-product-types";
import { cn } from "@/lib/utils";

/** Compact favorites / recent / frequent chips on nutrition main page. */
export const NutritionQuickFoods = memo(function NutritionQuickFoods({
  favorites,
  recents,
  frequent,
  onPick,
}: {
  favorites: FoodProduct[];
  recents: FoodProduct[];
  frequent: FoodProduct[];
  onPick: (food: FoodProduct) => void;
}) {
  const sections: {
    key: string;
    label: string;
    icon: typeof Star;
    foods: FoodProduct[];
  }[] = [
    { key: "fav", label: "Favoriten", icon: Star, foods: favorites.slice(0, 6) },
    { key: "rec", label: "Zuletzt", icon: Clock, foods: recents.slice(0, 6) },
    {
      key: "freq",
      label: "Häufig",
      icon: TrendingUp,
      foods: frequent.slice(0, 6),
    },
  ].filter((s) => s.foods.length > 0);

  if (sections.length === 0) return null;

  return (
    <section className="space-y-2">
      <h2 className="text-[10px] font-bold text-zinc-500 uppercase tracking-[0.15em] px-0.5">
        Schnell hinzufügen
      </h2>
      {sections.map((s) => {
        const Icon = s.icon;
        return (
          <div key={s.key} className="space-y-1.5">
            <p className="flex items-center gap-1.5 text-[11px] text-zinc-400 px-0.5">
              <Icon className="h-3 w-3" />
              {s.label}
            </p>
            <div className="flex gap-2 overflow-x-auto pb-1 -mx-0.5 px-0.5 scrollbar-none">
              {s.foods.map((f) => (
                <button
                  key={f.id ?? f.offCode ?? f.name}
                  type="button"
                  onClick={() => onPick(f)}
                  className={cn(
                    "shrink-0 max-w-[9.5rem] rounded-2xl border border-white/[0.08]",
                    "bg-zinc-900/80 px-3 py-2 text-left active:scale-[0.98]"
                  )}
                >
                  <p className="text-xs font-medium text-white truncate">{f.name}</p>
                  <p className="text-[10px] text-zinc-500 tabular-nums mt-0.5">
                    {Math.round(f.calories)} kcal / 100g
                  </p>
                </button>
              ))}
            </div>
          </div>
        );
      })}
    </section>
  );
});
