"use client";

import { use, useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import type { MealType } from "@prisma/client";
import { MEAL_TYPE_LABELS } from "@/lib/meal-types";
import { FullscreenPage } from "@/components/ui/fullscreen-page";
import { FoodSearchScreen } from "@/components/nutrition/food-search-screen";
import { FoodDetailScreen } from "@/components/nutrition/food-detail-screen";
import { useFoodFavorites } from "@/hooks/use-food-favorites";
import { ensureFoodItemId } from "@/lib/ensure-food-id";
import type { FoodProduct } from "@/lib/food/food-product-types";
import { applyNutritionMutationResponse } from "@/lib/nutrition-sync";
import { toast } from "sonner";

const VALID_MEALS = ["BREAKFAST", "LUNCH", "DINNER", "SNACK"] as const;

export default function NutritionAddPage({
  params,
}: {
  params: Promise<{ mealType: string }>;
}) {
  const { mealType: mealTypeParam } = use(params);
  const mealType = (
    VALID_MEALS.includes(mealTypeParam as (typeof VALID_MEALS)[number])
      ? mealTypeParam
      : "BREAKFAST"
  ) as MealType;
  const router = useRouter();
  const [step, setStep] = useState<"search" | "confirm">("search");
  const [selected, setSelected] = useState<FoodProduct | null>(null);
  const [adding, setAdding] = useState(false);
  const { isFavorite, toggleFavorite, favoriteFoods } = useFoodFavorites();

  const goBack = useCallback(() => {
    if (step === "confirm") {
      setStep("search");
      setSelected(null);
    } else {
      router.back();
    }
  }, [step, router]);

  const addFood = useCallback(
    async (quantityG: number) => {
      if (!selected) return;
      setAdding(true);
      try {
        const resolved = await ensureFoodItemId(selected);
        if ("error" in resolved) {
          toast.error(resolved.error);
          return;
        }
        const res = await fetch("/api/nutrition/quick-add", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            foodItemId: resolved.id,
            offCode: selected.offCode,
            quantityG,
            mealType,
          }),
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          toast.error((err as { error?: string }).error ?? "Fehler");
          return;
        }
        await applyNutritionMutationResponse(res);
        toast.success("Hinzugefügt");
        router.back();
      } catch {
        toast.error("Hinzufügen fehlgeschlagen");
      } finally {
        setAdding(false);
      }
    },
    [selected, mealType, router]
  );

  const logSavedMeal = useCallback(
    async (recipeId: string, name: string) => {
      setAdding(true);
      try {
        const res = await fetch(`/api/nutrition/recipes/${recipeId}/log`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ mealType }),
        });
        const data = await res.json();
        if (!res.ok) {
          toast.error(data.error ?? "Fehler");
          return;
        }
        if (data.dashboard) {
          const { publishNutritionDashboard } = await import("@/lib/nutrition-sync");
          publishNutritionDashboard(data.dashboard);
        }
        toast.success(`${name} hinzugefügt`);
        router.back();
      } catch {
        toast.error("Mahlzeit konnte nicht geladen werden");
      } finally {
        setAdding(false);
      }
    },
    [mealType, router]
  );

  return (
    <FullscreenPage
      title={step === "search" ? MEAL_TYPE_LABELS[mealType] : "Menge"}
      subtitle={step === "search" ? "Lebensmittel wählen" : selected?.name}
      onBack={goBack}
    >
      {step === "search" ? (
        <FoodSearchScreen
          favoriteFoods={favoriteFoods}
          onSelectFood={(food) => {
            setSelected(food);
            setStep("confirm");
          }}
          onLogSavedMeal={logSavedMeal}
          isFavorite={isFavorite}
          onToggleFavorite={async (food) => {
            let item = food;
            if (!food.id) {
              const resolved = await ensureFoodItemId(food);
              if ("error" in resolved) {
                toast.error(resolved.error);
                return;
              }
              item = { ...food, id: resolved.id };
            }
            await toggleFavorite(item);
          }}
        />
      ) : selected ? (
        <FoodDetailScreen
          product={selected}
          isFavorite={isFavorite(selected)}
          onToggleFavorite={async () => {
            let item = selected;
            if (!selected.id) {
              const resolved = await ensureFoodItemId(selected);
              if ("error" in resolved) {
                toast.error(resolved.error);
                return;
              }
              item = { ...selected, id: resolved.id };
              setSelected(item);
            }
            await toggleFavorite(item);
          }}
          onAdd={addFood}
          adding={adding}
        />
      ) : null}
    </FullscreenPage>
  );
}
