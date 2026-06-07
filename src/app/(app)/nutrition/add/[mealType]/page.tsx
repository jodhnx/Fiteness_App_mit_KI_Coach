"use client";

import { use } from "react";
import { useRouter } from "next/navigation";
import type { MealType } from "@prisma/client";
import { MEAL_TYPE_ORDER } from "@/lib/meal-types";
import { ProductSearchPanel } from "@/components/nutrition/product-search-panel";
import { useNutritionDashboard } from "@/hooks/use-nutrition-dashboard";
import { useFoodFavorites } from "@/hooks/use-food-favorites";
import { useFoodQuickAdd } from "@/hooks/use-food-quick-add";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

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
    onSuccess: () => router.push("/nutrition"),
  });

  return (
    <div className="max-w-lg mx-auto pb-8">
      <div className="flex items-center gap-2 mb-4">
        <Button type="button" variant="ghost" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-lg font-bold text-white">Lebensmittel hinzufügen</h1>
      </div>
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
        quickFoods={favoriteFoods}
      />
    </div>
  );
}
