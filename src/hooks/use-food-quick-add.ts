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
  const syncQuickAdd = useCallback(
    async (
      snapshot: NutritionDashboardPayload,
      foodItemId: string,
      product: FoodProduct,
      grams: number,
      targetMeal: MealType
    ) => {
      const res = await fetch("/api/nutrition/quick-add", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          foodItemId,
          offCode: product.offCode,
          quantityG: grams,
          mealType: targetMeal,
        }),
      });

      if (!res.ok) {
        applyDashboard(snapshot);
        const err = await res.json().catch(() => ({}));
        toast.error((err as { error?: string }).error ?? "Hinzufügen fehlgeschlagen");
        return;
      }

      const updated = await applyNutritionMutationResponse(res);
      if (!updated) applyDashboard(snapshot);
    },
    [applyDashboard]
  );

  const quickAdd = useCallback(
    (
      product: FoodProduct,
      quantityG?: number,
      mealType?: MealType,
      options?: { offCode?: string; mealType?: MealType }
    ) => {
      const targetMeal = mealType ?? options?.mealType;
      if (!targetMeal) return;

      const grams = quantityG ?? getDefaultQuickAddGrams(product);
      const snapshot = dashboard;
      const optimistic = optimisticAddMealItem(snapshot, product, grams, targetMeal);
      if (optimistic) applyDashboard(optimistic);
      onSuccess?.();

      void (async () => {
        if (product.id) {
          await syncQuickAdd(snapshot, product.id, product, grams, targetMeal);
          return;
        }
        const resolved = await ensureFoodItemId(product);
        if ("error" in resolved) {
          applyDashboard(snapshot);
          toast.error(resolved.error);
          return;
        }
        await syncQuickAdd(snapshot, resolved.id, product, grams, targetMeal);
      })();
    },
    [dashboard, applyDashboard, onSuccess, syncQuickAdd]
  );

  const quickAddById = useCallback(
    (
      foodItemId: string,
      quantityG: number,
      opts?: { offCode?: string; mealType?: MealType; product?: FoodProduct }
    ) => {
      if (!opts?.mealType) return;
      const targetMeal = opts.mealType;
      const product =
        opts.product ??
        ({
          id: foodItemId,
          name: "Lebensmittel",
          brand: null,
          calories: 0,
          proteinG: 0,
          carbsG: 0,
          fatG: 0,
          fiberG: 0,
          servingG: 100,
          source: "local",
        } satisfies FoodProduct);

      const snapshot = dashboard;
      const optimistic = optimisticAddMealItem(snapshot, product, quantityG, targetMeal);
      if (optimistic) applyDashboard(optimistic);
      onSuccess?.();

      void syncQuickAdd(snapshot, foodItemId, product, quantityG, targetMeal);
    },
    [dashboard, applyDashboard, onSuccess, syncQuickAdd]
  );

  return { quickAdd, quickAddById };
}
