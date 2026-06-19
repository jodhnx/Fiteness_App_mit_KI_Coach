"use client";

import { memo, useState, useCallback } from "react";
import type { MealType } from "@prisma/client";
import type { FoodProduct } from "@/lib/food/food-product-types";
import { ProductSearchPanel } from "@/components/nutrition/product-search-panel";
import { ProductDetailSheet } from "@/components/nutrition/product-detail-sheet";
import { MobileBottomSheet } from "@/components/ui/mobile-bottom-sheet";
import { MEAL_TYPE_LABELS } from "@/lib/meal-types";

type Props = {
  open: boolean;
  mealType: MealType;
  favoriteIds: Set<string>;
  quickFoods: FoodProduct[];
  onClose: () => void;
  onQuickAddFood: (
    product: FoodProduct,
    quantityG: number,
    meal: MealType
  ) => void;
  onToggleFavorite: (foodItemId: string) => Promise<void>;
};

export const AddFoodSheet = memo(function AddFoodSheet({
  open,
  mealType,
  favoriteIds,
  quickFoods,
  onClose,
  onQuickAddFood,
  onToggleFavorite,
}: Props) {
  const [detailProduct, setDetailProduct] = useState<FoodProduct | null>(null);
  const [detailMeal, setDetailMeal] = useState<MealType>(mealType);

  const closeAll = useCallback(() => {
    setDetailProduct(null);
    onClose();
  }, [onClose]);

  const openDetail = useCallback(
    (product: FoodProduct) => {
      setDetailProduct(product);
      setDetailMeal(mealType);
    },
    [mealType]
  );

  const addFromDetail = useCallback(
    (quantityG: number, m: MealType) => {
      if (!detailProduct) return;
      onQuickAddFood(detailProduct, quantityG, m);
      setDetailProduct(null);
    },
    [detailProduct, onQuickAddFood]
  );

  return (
    <>
      <MobileBottomSheet
        open={open}
        onClose={closeAll}
        title={`${MEAL_TYPE_LABELS[mealType]} hinzufügen`}
        subtitle="Lebensmittel"
        variant="full"
        layer="base"
        bodyClassName="mobile-sheet-body--flush"
      >
        <ProductSearchPanel
          mealType={mealType}
          favoriteIds={favoriteIds}
          onQuickAddFood={onQuickAddFood}
          onToggleFavorite={onToggleFavorite}
          onOpenDetail={openDetail}
          quickFoods={quickFoods}
          embedded
        />
      </MobileBottomSheet>

      {detailProduct && (
        <ProductDetailSheet
          product={detailProduct}
          mealType={detailMeal}
          onMealTypeChange={setDetailMeal}
          favoriteIds={favoriteIds}
          onToggleFavorite={onToggleFavorite}
          onClose={() => setDetailProduct(null)}
          onAdd={addFromDetail}
        />
      )}
    </>
  );
});
