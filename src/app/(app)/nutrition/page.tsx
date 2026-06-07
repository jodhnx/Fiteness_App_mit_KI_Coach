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
  NUTRITION_DASHBOARD_CACHE_KEY,
} from "@/lib/nutrition-sync";
import { getCached } from "@/lib/client-cache";
import { RemainingMacrosHero } from "@/components/nutrition/remaining-macros-hero";
import { MealTrackList } from "@/components/nutrition/meal-track-list";
import { WaterTracker } from "@/components/nutrition/water-tracker";
import { FoodAddPopup } from "@/components/nutrition/food-add-popup";
import { MEAL_TYPE_ORDER } from "@/lib/meal-types";
import type { MealType } from "@prisma/client";
import { toast } from "sonner";
import { RefreshCw, AlertCircle, Settings2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/layout/page-header";
import Link from "next/link";

const VALID_MEALS = new Set<string>(MEAL_TYPE_ORDER);

export default function NutritionPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [expandedMeal, setExpandedMeal] = useState<MealType | null>(null);
  const [addSheetMeal, setAddSheetMeal] = useState<MealType | null>(null);

  useEffect(() => {
    const add = searchParams.get("add");
    if (add && VALID_MEALS.has(add)) {
      setAddSheetMeal(add as MealType);
    }
  }, [searchParams]);

  const {
    dashboard,
    loading,
    error,
    timedOut,
    reload,
    applyDashboard,
  } = useNutritionDashboard(120_000);

  const { favoriteIds, favoriteFoods, toggleFavorite } = useFoodFavorites();

  const { quickAdd } = useFoodQuickAdd({
    dashboard,
    applyDashboard,
  });

  const refreshAll = useCallback(() => {
    invalidateAllNutritionCaches();
    reload();
  }, [reload]);

  const removeItem = useCallback(
    async (itemId: string) => {
      const optimistic = optimisticRemoveMealItem(dashboard, itemId);
      if (optimistic) applyDashboard(optimistic);
      const res = await fetch(`/api/nutrition/items/${itemId}`, { method: "DELETE" });
      if (!res.ok) {
        toast.error("Löschen fehlgeschlagen");
        refreshAll();
        return;
      }
      const updated = await applyNutritionMutationResponse(res);
      if (!updated) refreshAll();
    },
    [dashboard, applyDashboard, refreshAll]
  );

  const deleteMeal = useCallback(
    async (mealId: string) => {
      if (!window.confirm("Diese Mahlzeit und alle Einträge löschen?")) return;
      const res = await fetch(`/api/nutrition/meals/${mealId}`, { method: "DELETE" });
      if (!res.ok) {
        toast.error("Mahlzeit konnte nicht gelöscht werden");
        return;
      }
      const updated = await applyNutritionMutationResponse(res);
      if (!updated) refreshAll();
      else toast.success("Mahlzeit gelöscht");
    },
    [refreshAll]
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
      const res = await fetch(`/api/nutrition/items/${itemId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ quantityG }),
      });
      if (!res.ok) {
        toast.error("Speichern fehlgeschlagen");
        return;
      }
      const updated = await applyNutritionMutationResponse(res);
      if (!updated) refreshAll();
      else toast.success("Eintrag aktualisiert");
    },
    [refreshAll]
  );

  const addWater = useCallback(
    async (amountMl: number) => {
      const res = await fetch("/api/nutrition/water", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amountMl }),
      });
      if (!res.ok) {
        toast.error("Wasser konnte nicht gespeichert werden");
        return;
      }
      const body = await res.json().catch(() => ({}));
      if (body.dashboard) applyDashboard(body.dashboard);
      else refreshAll();
    },
    [applyDashboard, refreshAll]
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

  const closeAddPopup = useCallback(() => {
    setAddSheetMeal(null);
    if (searchParams.get("add")) {
      router.replace("/nutrition");
    }
  }, [router, searchParams]);

  return (
    <div className="nutrition-mobile-page space-y-5 pb-28">
      <PageHeader
        title="Ernährung"
        subtitle="Schnell tracken · DACH-Produkte · Standardgerichte"
        action={
          <Link
            href="/settings"
            className="p-2 rounded-xl border border-zinc-800 text-zinc-400 hover:text-white"
            aria-label="Einstellungen"
          >
            <Settings2 className="h-5 w-5" />
          </Link>
        }
      />

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

      <div
        className={
          loading && getCached(NUTRITION_DASHBOARD_CACHE_KEY) === null ? "opacity-80" : ""
        }
      >
        <RemainingMacrosHero
          calories={{
            consumed: dashboard.consumed.calories,
            target: dashboard.targets.calories,
            remaining: dashboard.remaining.calories,
          }}
          protein={{
            consumed: dashboard.consumed.proteinG,
            target: dashboard.targets.proteinG,
            remaining: dashboard.remaining.proteinG,
          }}
          carbs={{
            consumed: dashboard.consumed.carbsG,
            target: dashboard.targets.carbsG,
            remaining: dashboard.remaining.carbsG,
          }}
          fat={{
            consumed: dashboard.consumed.fatG,
            target: dashboard.targets.fatG,
            remaining: dashboard.remaining.fatG,
          }}
          fiber={{
            consumed: dashboard.consumed.fiberG ?? 0,
            target: dashboard.targets.fiberG ?? 35,
          }}
        />
      </div>

      <section>
        <h2 className="text-sm font-semibold text-zinc-400 uppercase tracking-wide mb-3">
          Mahlzeiten
        </h2>
        <MealTrackList
          meals={dashboard.mealsByType}
          expandedMeal={expandedMeal}
          onToggle={(m) => setExpandedMeal((e) => (e === m ? null : m))}
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
    </div>
  );
}
