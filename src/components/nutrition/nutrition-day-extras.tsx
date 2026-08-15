"use client";

import { memo } from "react";
import { Coffee, Sun, Moon, Cookie, Wheat } from "lucide-react";
import type { NutritionDashboardPayload } from "@/lib/nutrition-defaults";
import { TRACK_MEAL_ORDER, MEAL_TYPE_LABELS } from "@/lib/meal-types";
import { cn } from "@/lib/utils";
import type { MealType } from "@prisma/client";

const MEAL_ICONS: Partial<Record<MealType, typeof Coffee>> = {
  BREAKFAST: Coffee,
  LUNCH: Sun,
  DINNER: Moon,
  SNACK: Cookie,
};

/** Compact meal + fiber overview under calorie ring. */
export const NutritionDayExtras = memo(function NutritionDayExtras({
  dashboard,
  onAddMeal,
}: {
  dashboard: NutritionDashboardPayload;
  onAddMeal?: (meal: MealType) => void;
}) {
  const slots = TRACK_MEAL_ORDER.map((type) => {
    const found = dashboard.mealsByType.find((m) => m.mealType === type);
    const items = found?.items.length ?? 0;
    const kcal = Math.round(found?.totals.calories ?? 0);
    return { type, items, kcal };
  });

  const logged = slots.filter((s) => s.items > 0).length;
  const fiber = Math.round(dashboard.consumed.fiberG ?? 0);

  return (
    <div className="space-y-2.5">
      <div className="flex items-center justify-between px-0.5">
        <h2 className="text-[10px] font-bold text-zinc-500 uppercase tracking-[0.15em]">
          Tagesübersicht
        </h2>
        <span className="text-[11px] text-zinc-500 tabular-nums">
          {logged}/{slots.length} Mahlzeiten
        </span>
      </div>

      <div className="grid grid-cols-4 gap-1.5">
        {slots.map((s) => {
          const Icon = MEAL_ICONS[s.type] ?? Cookie;
          const done = s.items > 0;
          return (
            <button
              key={s.type}
              type="button"
              onClick={() => onAddMeal?.(s.type)}
              className={cn(
                "rounded-2xl border px-1.5 py-2.5 text-center transition-colors active:scale-[0.98]",
                done
                  ? "border-accent/30 bg-accent/10"
                  : "border-white/[0.06] bg-zinc-900/60"
              )}
            >
              <Icon
                className={cn(
                  "h-4 w-4 mx-auto",
                  done ? "text-accent" : "text-zinc-500"
                )}
              />
              <p className="text-[10px] text-zinc-400 mt-1 truncate">
                {MEAL_TYPE_LABELS[s.type]}
              </p>
              <p
                className={cn(
                  "text-[11px] font-semibold tabular-nums mt-0.5",
                  done ? "text-white" : "text-zinc-600"
                )}
              >
                {done ? `${s.kcal}` : "—"}
              </p>
            </button>
          );
        })}
      </div>

      <div className="flex items-center gap-2 rounded-2xl border border-white/[0.06] bg-zinc-900/50 px-3 py-2.5">
        <Wheat className="h-4 w-4 text-amber-400/90 shrink-0" />
        <div className="min-w-0 flex-1">
          <p className="text-[11px] text-zinc-400">Ballaststoffe</p>
          <p className="text-sm font-semibold text-white tabular-nums">
            {fiber} g
          </p>
        </div>
        <p className="text-[10px] text-zinc-600">heute</p>
      </div>
    </div>
  );
});
