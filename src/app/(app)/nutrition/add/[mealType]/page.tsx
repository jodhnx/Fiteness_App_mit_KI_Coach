"use client";

import { use, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import type { MealType } from "@prisma/client";
import { MEAL_TYPE_ORDER, MEAL_TYPE_LABELS } from "@/lib/meal-types";
import { ProductSearchPanel } from "@/components/nutrition/product-search-panel";
import { ProductDetailSheet } from "@/components/nutrition/product-detail-sheet";
import { MobileBottomSheet } from "@/components/ui/mobile-bottom-sheet";
import { useNutritionDashboard } from "@/hooks/use-nutrition-dashboard";
import { useFoodFavorites } from "@/hooks/use-food-favorites";
import { useFoodQuickAdd } from "@/hooks/use-food-quick-add";
import type { FoodProduct } from "@/lib/food/food-product-types";

const VALID = new Set(MEAL_TYPE_ORDER);

export default function AddFoodPage({
  params,
}: {
  params: Promise<{ mealType: string }>;
}) {
  const { mealType: raw } = use(params);
  const router = useRouter();
  const mealType = VALID.has(raw as MealType) ? (raw as MealType) : "SNACK";

  const { dashboard, applyDashboard } = useNutritionDashboard();
  const { favoriteIds, favoriteFoods, toggleFavorite } = useFoodFavorites();
  const { quickAdd } = useFoodQuickAdd({
    dashboard,
    applyDashboard,
    onSuccess: () => router.replace("/nutrition"),
  });

  const [detailProduct, setDetailProduct] = useState<FoodProduct | null>(null);
  const [detailMeal, setDetailMeal] = useState<MealType>(mealType);
  const [adding, setAdding] = useState(false);

  const addFromDetail = useCallback(
    async (quantityG: number, m: MealType) => {
      if (!detailProduct) return;
      setAdding(true);
      try {
        await quickAdd(detailProduct, quantityG, m);
        setDetailProduct(null);
      } finally {
        setAdding(false);
      }
    },
    [detailProduct, quickAdd]
  );

  return (
    <>
      <MobileBottomSheet
        open
        onClose={() => router.replace("/nutrition")}
        title={`${MEAL_TYPE_LABELS[mealType]} hinzufügen`}
        subtitle="Lebensmittel"
        variant="full"
        layer="base"
        bodyClassName="mobile-sheet-body--flush"
      >
        <ProductSearchPanel
          mealType={mealType}
          favoriteIds={favoriteIds}
          onQuickAddFood={quickAdd}
          onToggleFavorite={async (id) => {
            const food = favoriteFoods.find((f) => f.id === id) ?? {
              id,
              name: "",
              brand: null,
              calories: 0,
              proteinG: 0,
              carbsG: 0,
              fatG: 0,
              fiberG: null,
              servingG: 100,
              source: "local" as const,
            };
            await toggleFavorite(food);
          }}
          onOpenDetail={(p) => {
            setDetailProduct(p);
            setDetailMeal(mealType);
          }}
          quickFoods={favoriteFoods}
          embedded
        />
      </MobileBottomSheet>

      {detailProduct && (
        <ProductDetailSheet
          product={detailProduct}
          mealType={detailMeal}
          onMealTypeChange={setDetailMeal}
          favoriteIds={favoriteIds}
          onToggleFavorite={async (id) => {
            const food =
              favoriteFoods.find((f) => f.id === id) ??
              detailProduct ??
              ({
                id,
                name: "",
                brand: null,
                calories: 0,
                proteinG: 0,
                carbsG: 0,
                fatG: 0,
                fiberG: null,
                servingG: 100,
                source: "local" as const,
              } satisfies FoodProduct);
            await toggleFavorite(food);
          }}
          onClose={() => setDetailProduct(null)}
          onAdd={addFromDetail}
          adding={adding}
        />
      )}
    </>
  );
}
