"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useNutritionDashboard } from "@/hooks/use-nutrition-dashboard";
import { useFoodFavorites } from "@/hooks/use-food-favorites";
import { useFoodQuickAdd } from "@/hooks/use-food-quick-add";
import {
  invalidateAllNutritionCaches,
  applyNutritionMutationResponse,
  optimisticRemoveMealItem,
  optimisticRemoveMeal,
  optimisticPatchItemQuantity,
  optimisticAddWater,
} from "@/lib/nutrition-sync";
import { PageShell } from "@/components/layout/page-shell";
import { NutritionOverviewPanel } from "@/components/nutrition/nutrition-overview-panel";
import { MealTrackList } from "@/components/nutrition/meal-track-list";
import { WaterTracker } from "@/components/nutrition/water-tracker";
import { FoodAddPopup } from "@/components/nutrition/food-add-popup";
import { MEAL_TYPE_ORDER } from "@/lib/meal-types";
import type { MealType } from "@prisma/client";
import { toast } from "sonner";
import { RefreshCw, AlertCircle, Settings2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { warmNutritionSearchCaches } from "@/lib/nav-cache-warmer";
import { resetBodyScroll } from "@/lib/scroll-lock";

const VALID_MEALS = new Set<string>(MEAL_TYPE_ORDER);

export default function NutritionPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [addSheetMeal, setAddSheetMeal] = useState<MealType | null>(null);

  useEffect(() => {
    warmNutritionSearchCaches();
  }, []);

  useEffect(() => {
    const add = searchParams.get("add");
    if (add && VALID_MEALS.has(add)) {
      setAddSheetMeal(add as MealType);
    }
  }, [searchParams]);

  const { dashboard, error, timedOut, reload, applyDashboard } = useNutritionDashboard(120_000);

  const { favoriteIds, favoriteFoods, toggleFavorite } = useFoodFavorites();

  const closeAddPopup = useCallback(() => {
    setAddSheetMeal(null);
    resetBodyScroll();
    if (searchParams.get("add")) {
      router.replace("/nutrition");
    }
  }, [router, searchParams]);

  const onFoodAdded = useCallback(() => {
    closeAddPopup();
    toast.success("Lebensmittel hinzugefügt ✓", { duration: 2000 });
  }, [closeAddPopup]);

  const { quickAdd } = useFoodQuickAdd({
    dashboard,
    applyDashboard,
    onSuccess: onFoodAdded,
  });

  const refreshAll = useCallback(() => {
    invalidateAllNutritionCaches();
    reload();
  }, [reload]);

  const removeItem = useCallback(
    async (itemId: string) => {
      const snapshot = dashboard;
      const optimistic = optimisticRemoveMealItem(snapshot, itemId);
      if (optimistic) applyDashboard(optimistic);
      const res = await fetch(`/api/nutrition/items/${itemId}`, { method: "DELETE" });
      if (!res.ok) {
        applyDashboard(snapshot);
        toast.error("Löschen fehlgeschlagen");
        return;
      }
      const updated = await applyNutritionMutationResponse(res);
      if (!updated) applyDashboard(snapshot);
    },
    [dashboard, applyDashboard]
  );

  const deleteMeal = useCallback(
    async (mealId: string) => {
      if (!window.confirm("Diese Mahlzeit und alle Einträge löschen?")) return;
      const snapshot = dashboard;
      const optimistic = optimisticRemoveMeal(snapshot, mealId);
      if (optimistic) applyDashboard(optimistic);
      const res = await fetch(`/api/nutrition/meals/${mealId}`, { method: "DELETE" });
      if (!res.ok) {
        applyDashboard(snapshot);
        toast.error("Mahlzeit konnte nicht gelöscht werden");
        return;
      }
      const updated = await applyNutritionMutationResponse(res);
      if (!updated) applyDashboard(snapshot);
      else toast.success("Mahlzeit gelöscht");
    },
    [dashboard, applyDashboard]
  );

  const editItemQuantity = useCallback(
    async (itemId: string, currentQty: number) => {
      const raw = window.prompt("Menge in Gramm:", String(currentQty));
      if (raw == null) return;
      const quantityG = Number(raw);
      if (!Number.isFinite(quantityG) || quantityG <= 0) {
        toast.error("Ungültige Menge");
        return;
      }
      const snapshot = dashboard;
      const optimistic = optimisticPatchItemQuantity(snapshot, itemId, quantityG);
      if (optimistic) applyDashboard(optimistic);
      const res = await fetch(`/api/nutrition/items/${itemId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ quantityG }),
      });
      if (!res.ok) {
        applyDashboard(snapshot);
        toast.error("Speichern fehlgeschlagen");
        return;
      }
      const updated = await applyNutritionMutationResponse(res);
      if (!updated) applyDashboard(snapshot);
      else toast.success("Eintrag aktualisiert");
    },
    [dashboard, applyDashboard]
  );

  const addWater = useCallback(
    async (amountMl: number) => {
      const snapshot = dashboard;
      const optimistic = optimisticAddWater(snapshot, amountMl);
      if (optimistic) applyDashboard(optimistic);
      const res = await fetch("/api/nutrition/water", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amountMl }),
      });
      if (!res.ok) {
        applyDashboard(snapshot);
        toast.error("Wasser konnte nicht gespeichert werden");
        return;
      }
      const updated = await applyNutritionMutationResponse(res);
      if (!updated) applyDashboard(snapshot);
    },
    [dashboard, applyDashboard]
  );

  const handleToggleFavorite = useCallback(
    async (foodItemId: string) => {
      const food = favoriteFoods.find((f) => f.id === foodItemId) ?? {
        id: foodItemId,
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
    },
    [favoriteFoods, toggleFavorite]
  );

  return (
    <PageShell
      title="Ernährung"
      className="nutrition-mobile-page keyboard-stable-page pb-28"
      bottomNav={false}
      action={
        <Link
          href="/settings"
          className="p-2 rounded-xl border border-zinc-800 text-zinc-400 hover:text-white"
          aria-label="Einstellungen"
        >
          <Settings2 className="h-5 w-5" />
        </Link>
      }
    >

      {(error || timedOut) && (
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 flex gap-3">
          <AlertCircle className="h-5 w-5 text-red-400 shrink-0" />
          <div className="flex-1">
            <p className="text-sm text-red-100">
              {timedOut ? "Laden dauert zu lange" : "Daten nicht geladen"}
            </p>
            <Button type="button" variant="outline" size="sm" className="mt-2" onClick={refreshAll}>
              <RefreshCw className="h-4 w-4 mr-1" />
              Erneut
            </Button>
          </div>
        </div>
      )}

      {!dashboard.profileComplete && dashboard.targets.calories <= 0 && (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
          Ziele fehlen —{" "}
          <Link href="/settings" className="underline font-medium">
            Einstellungen öffnen
          </Link>
        </div>
      )}

      <NutritionOverviewPanel dashboard={dashboard} />

      <section className="pt-1">
        <h2 className="text-xs font-bold text-zinc-500 uppercase tracking-[0.15em] mb-2 px-0.5">
          Mahlzeiten
        </h2>
        <MealTrackList
          meals={dashboard.mealsByType}
          onRemove={removeItem}
          onEdit={editItemQuantity}
          onDeleteMeal={deleteMeal}
          onAddClick={(mealType) => setAddSheetMeal(mealType)}
        />
      </section>

      <WaterTracker
        consumedMl={dashboard.water.consumedMl}
        targetMl={dashboard.water.targetMl}
        onAdd={addWater}
      />

      {addSheetMeal && (
        <FoodAddPopup
          open
          mealType={addSheetMeal}
          favoriteIds={favoriteIds}
          onClose={closeAddPopup}
          onQuickAddFood={quickAdd}
          onToggleFavorite={handleToggleFavorite}
        />
      )}
    </PageShell>
  );
}
