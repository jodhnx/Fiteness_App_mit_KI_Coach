"use client";

import { useCallback } from "react";
import type { MealType } from "@prisma/client";
import type { FoodProduct } from "@/lib/food/food-product-types";
import type { NutritionDashboardPayload } from "@/lib/nutrition-defaults";
import {
  applyNutritionMutationResponse,
  optimisticAddMealItem,
} from "@/lib/nutrition-sync";
import { ensureFoodItemId } from "@/lib/ensure-food-id";
import { getDefaultQuickAddGrams } from "@/lib/food/portion-presets";
import { toast } from "sonner";

type Options = {
  dashboard: NutritionDashboardPayload;
  applyDashboard: (next: NutritionDashboardPayload) => void;
  onSuccess?: () => void;
};

export function useFoodQuickAdd({ dashboard, applyDashboard, onSuccess }: Options) {
  const quickAdd = useCallback(
    async (
      product: FoodProduct,
      quantityG?: number,
      mealType?: MealType,
      options?: { offCode?: string; mealType?: MealType }
    ) => {
      const targetMeal = mealType ?? options?.mealType;
      if (!targetMeal) return;

      const grams = quantityG ?? getDefaultQuickAddGrams(product);
      const optimistic = optimisticAddMealItem(dashboard, product, grams, targetMeal);
      if (optimistic) applyDashboard(optimistic);

      const resolved = await ensureFoodItemId(product);
      if ("error" in resolved) {
        applyDashboard(dashboard);
        toast.error(resolved.error);
        return;
      }

      const res = await fetch("/api/nutrition/quick-add", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          foodItemId: resolved.id,
          offCode: product.offCode,
          quantityG: grams,
          mealType: targetMeal,
        }),
      });

      if (!res.ok) {
        applyDashboard(dashboard);
        const err = await res.json().catch(() => ({}));
        toast.error((err as { error?: string }).error ?? "Hinzufügen fehlgeschlagen");
        return;
      }

      const updated = await applyNutritionMutationResponse(res);
      if (!updated) applyDashboard(dashboard);
      else {
        toast.success(`${product.name} hinzugefügt`);
        onSuccess?.();
      }
    },
    [dashboard, applyDashboard, onSuccess]
  );

  const quickAddById = useCallback(
    async (
      foodItemId: string,
      quantityG: number,
      opts?: { offCode?: string; mealType?: MealType }
    ) => {
      if (!opts?.mealType) return;
      const res = await fetch("/api/nutrition/quick-add", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          foodItemId,
          offCode: opts.offCode,
          quantityG,
          mealType: opts.mealType,
        }),
      });
      if (!res.ok) {
        toast.error("Hinzufügen fehlgeschlagen");
        return;
      }
      await applyNutritionMutationResponse(res);
      onSuccess?.();
    },
    [onSuccess]
  );

  return { quickAdd, quickAddById };
}
