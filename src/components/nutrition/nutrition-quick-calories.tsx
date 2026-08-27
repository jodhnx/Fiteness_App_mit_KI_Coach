"use client";

import { memo, useCallback, useState } from "react";
import type { MealType } from "@prisma/client";
import type { NutritionDashboardPayload } from "@/lib/nutrition-defaults";
import {
  applyNutritionMutationResponse,
  optimisticAddMealItem,
} from "@/lib/nutrition-sync";
import { hapticTap } from "@/lib/haptic";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const PRESETS = [100, 250, 500] as const;

type Props = {
  dashboard: NutritionDashboardPayload;
  applyDashboard: (next: NutritionDashboardPayload) => void;
  defaultMeal?: MealType;
};

/** One-tap calorie logging — labeled clearly as Quick Add. */
export const NutritionQuickCalories = memo(function NutritionQuickCalories({
  dashboard,
  applyDashboard,
  defaultMeal = "SNACK",
}: Props) {
  const [busy, setBusy] = useState(false);

  const addKcal = useCallback(
    async (kcal: number) => {
      if (busy || kcal <= 0) return;
      hapticTap();
      setBusy(true);

      const snapshot = dashboard;
      const optimistic = optimisticAddMealItem(
        snapshot,
        {
          name: "Quick Add",
          calories: kcal,
          proteinG: 0,
          carbsG: 0,
          fatG: 0,
          fiberG: 0,
          servingG: 100,
        },
        100,
        defaultMeal
      );
      if (optimistic) applyDashboard(optimistic);

      try {
        const res = await fetch("/api/nutrition/log", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "same-origin",
          body: JSON.stringify({
            mealType: defaultMeal,
            name: "Quick Add",
            quantityG: 100,
            calories: kcal,
            proteinG: 0,
            carbsG: 0,
            fatG: 0,
          }),
        });
        if (!res.ok) {
          applyDashboard(snapshot);
          toast.error("Quick Add fehlgeschlagen");
          return;
        }
        const updated = await applyNutritionMutationResponse(res);
        if (!updated) applyDashboard(snapshot);
        else toast.success(`+${kcal} kcal`, { duration: 1200 });
      } catch {
        applyDashboard(snapshot);
        toast.error("Quick Add fehlgeschlagen");
      } finally {
        setBusy(false);
      }
    },
    [applyDashboard, busy, dashboard, defaultMeal]
  );

  return (
    <div className="rounded-2xl border border-white/[0.07] bg-zinc-900/50 px-3.5 py-3">
      <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-zinc-500 mb-2">
        Quick Add · Kalorien
      </p>
      <div className="flex flex-wrap gap-2">
        {PRESETS.map((kcal) => (
          <button
            key={kcal}
            type="button"
            disabled={busy}
            onClick={() => void addKcal(kcal)}
            className={cn(
              "min-h-11 flex-1 min-w-[5.5rem] rounded-xl border border-accent/25 bg-accent/10",
              "text-sm font-semibold text-accent active:scale-[0.98] transition-transform",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40",
              busy && "opacity-60"
            )}
          >
            +{kcal} kcal
          </button>
        ))}
        <button
          type="button"
          disabled={busy}
          onClick={() => {
            const raw = window.prompt("Kalorien eingeben:", "200");
            if (raw == null) return;
            const kcal = Math.round(Number(raw.replace(",", ".")));
            if (!Number.isFinite(kcal) || kcal <= 0) {
              toast.error("Ungültige Kalorien");
              return;
            }
            void addKcal(kcal);
          }}
          className={cn(
            "min-h-11 rounded-xl border border-white/10 bg-white/[0.04]",
            "px-4 text-sm font-medium text-zinc-300 active:scale-[0.98] transition-transform",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40",
            busy && "opacity-60"
          )}
        >
          Eigene kcal
        </button>
      </div>
    </div>
  );
});
