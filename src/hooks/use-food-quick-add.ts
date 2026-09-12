"use client";

import { useCallback, useRef, useState } from "react";
import type { MealType } from "@prisma/client";
import type { FoodProduct } from "@/lib/food/food-product-types";
import type { NutritionDashboardPayload } from "@/lib/nutrition-defaults";
import {
  applyNutritionMutationResponse,
  optimisticAddMealItem,
} from "@/lib/nutrition-sync";
import { ensureFoodItemId } from "@/lib/ensure-food-id";
import { getDefaultQuickAddGrams } from "@/lib/food/portion-presets";
import { confirmedMacrosForQuantity } from "@/lib/food/confirmed-macros";
import { toast } from "sonner";

type Options = {
  dashboard: NutritionDashboardPayload | null | undefined;
  applyDashboard: (next: NutritionDashboardPayload) => void;
  onSuccess?: () => void;
};

export function useFoodQuickAdd({ dashboard, applyDashboard, onSuccess }: Options) {
  const inflight = useRef(0);
  const [adding, setAdding] = useState(false);

  const beginAdd = useCallback(() => {
    inflight.current += 1;
    setAdding(true);
  }, []);

  const endAdd = useCallback(() => {
    inflight.current = Math.max(0, inflight.current - 1);
    setAdding(inflight.current > 0);
  }, []);

  const syncQuickAdd = useCallback(
    async (
      snapshot: NutritionDashboardPayload,
      foodItemId: string | undefined,
      product: FoodProduct,
      grams: number,
      targetMeal: MealType
    ) => {
      const confirmed = confirmedMacrosForQuantity(
        {
          calories: product.calories,
          proteinG: product.proteinG,
          carbsG: product.carbsG,
          fatG: product.fatG,
          servingG: product.servingG || 100,
        },
        grams
      );

      const res = await fetch("/api/nutrition/quick-add", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          foodItemId,
          offCode: product.offCode,
          quantityG: grams,
          mealType: targetMeal,
          confirmed: {
            ...confirmed,
            name: product.name,
            brand: product.brand ?? null,
          },
        }),
      });

      if (!res.ok) {
        applyDashboard(snapshot);
        const err = await res.json().catch(() => ({}));
        toast.error(
          (err as { error?: string }).error ??
            "Hinzufügen fehlgeschlagen — Eintrag wurde zurückgesetzt"
        );
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
      if (!snapshot) {
        toast.error("Erährungsdaten noch nicht geladen");
        return;
      }
      const optimistic = optimisticAddMealItem(snapshot, product, grams, targetMeal);
      if (optimistic) applyDashboard(optimistic);
      onSuccess?.();
      beginAdd();

      void (async () => {
        try {
          if (product.id) {
            await syncQuickAdd(snapshot, product.id, product, grams, targetMeal);
            return;
          }
          // Still try to resolve an id for recent/history, but confirmed macros win on save.
          const resolved = await ensureFoodItemId(product);
          const id = "error" in resolved ? undefined : resolved.id;
          if ("error" in resolved && !product.offCode) {
            // Confirmed path can still save without catalog id
            await syncQuickAdd(snapshot, undefined, product, grams, targetMeal);
            return;
          }
          await syncQuickAdd(snapshot, id, product, grams, targetMeal);
        } finally {
          endAdd();
        }
      })();
    },
    [dashboard, applyDashboard, onSuccess, syncQuickAdd, beginAdd, endAdd]
  );

  const quickAddById = useCallback(
    (
      foodItemId: string,
      quantityG: number,
      opts?: { offCode?: string; mealType?: MealType; product?: FoodProduct }
    ) => {
      if (!opts?.mealType) return;
      const targetMeal = opts.mealType;
      if (!dashboard) {
        toast.error("Erährungsdaten noch nicht geladen");
        return;
      }
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
      beginAdd();
      void syncQuickAdd(snapshot, foodItemId, product, quantityG, targetMeal).finally(
        endAdd
      );
    },
    [dashboard, applyDashboard, onSuccess, syncQuickAdd, beginAdd, endAdd]
  );

  return { quickAdd, quickAddById, adding };
}
