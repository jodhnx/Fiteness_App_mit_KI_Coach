"use client";

import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useNutritionPageDashboard } from "@/hooks/use-nutrition-page-dashboard";
import { useFoodFavorites } from "@/hooks/use-food-favorites";
import { useFoodQuickAdd } from "@/hooks/use-food-quick-add";
import {
  applyNutritionMutationResponse,
  optimisticRemoveMealItem,
  optimisticRemoveMeal,
  optimisticPatchItemQuantity,
  optimisticAddWater,
  optimisticAddMealItem,
  optimisticAddSavedMeal,
  HOME_DATA_CACHE_KEY,
} from "@/lib/nutrition-sync";
import { getCached } from "@/lib/client-cache";
import type { HomeDataPayload } from "@/lib/home-defaults";
import { getCachedSavedMeals } from "@/lib/saved-meals-cache";
import { PageShell } from "@/components/layout/page-shell";
import { NutritionOrbitOverview } from "@/components/nutrition/nutrition-orbit-overview";
import { MealTrackList } from "@/components/nutrition/meal-track-list";
import { WaterTracker } from "@/components/nutrition/water-tracker";
import dynamic from "next/dynamic";
import { MEAL_TYPE_ORDER, mealTypeForHour } from "@/lib/meal-types";
import type { MealType } from "@prisma/client";
import { toast } from "sonner";
import { Camera, RefreshCw, AlertCircle } from "lucide-react";
import Link from "next/link";
import { refreshFoodHistoryCache } from "@/lib/food-history-cache";
import { resetBodyScroll } from "@/lib/scroll-lock";
import type { FoodAIItem } from "@/app/api/nutrition/food-ai/route";
import {
  NutritionAddSheet,
  type NutritionAddAction,
} from "@/components/nutrition/nutrition-add-sheet";

const FoodAddPopup = dynamic(
  () =>
    import("@/components/nutrition/food-add-popup").then((m) => m.FoodAddPopup),
  { ssr: false }
);

const FoodAISheet = dynamic(
  () =>
    import("@/components/nutrition/food-ai-sheet").then((m) => m.FoodAISheet),
  { ssr: false }
);

const QuickEntrySheet = dynamic(
  () =>
    import("@/components/nutrition/quick-entry-sheet").then(
      (m) => m.QuickEntrySheet
    ),
  { ssr: false }
);

const ConfirmDialog = dynamic(
  () => import("@/components/ui/confirm-dialog").then((m) => m.ConfirmDialog),
  { ssr: false }
);

const VALID_MEALS = new Set<string>(MEAL_TYPE_ORDER);

export default function NutritionPage() {
  return (
    <Suspense fallback={null}>
      <NutritionPageInner />
    </Suspense>
  );
}

function NutritionPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [addSheetMeal, setAddSheetMeal] = useState<MealType | null>(null);
  const [searchMeal, setSearchMeal] = useState<MealType | null>(null);
  const [quickMeal, setQuickMeal] = useState<MealType | null>(null);
  const [addInitialQuery, setAddInitialQuery] = useState("");
  const [foodAIOpen, setFoodAIOpen] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<{
    mealId: string;
    label: string;
  } | null>(null);
  const [streakDays, setStreakDays] = useState(0);

  useEffect(() => {
    const home = getCached<HomeDataPayload>(HOME_DATA_CACHE_KEY);
    const days = home?.nutritionStreak?.currentDays ?? 0;
    if (typeof days === "number") setStreakDays(days);
  }, []);

  useEffect(() => {
    void import("@/components/nutrition/food-add-popup");
  }, []);

  useEffect(() => {
    const add = searchParams.get("add");
    if (add && VALID_MEALS.has(add)) {
      setSearchMeal(add as MealType);
      setAddInitialQuery(searchParams.get("q")?.trim() ?? "");
    }
  }, [searchParams]);

  const { dashboard, loading, reload, applyDashboard } = useNutritionPageDashboard(120_000);
  const dashboardRef = useRef(dashboard);
  dashboardRef.current = dashboard;

  const applyOptimistic = useCallback(
    (next: NonNullable<ReturnType<typeof optimisticRemoveMealItem>>) => {
      dashboardRef.current = next;
      applyDashboard(next);
    },
    [applyDashboard]
  );

  const { favoriteIds, favoriteFoods, toggleFavorite } = useFoodFavorites(
    searchMeal != null
  );

  const closeSearchPopup = useCallback(() => {
    setSearchMeal(null);
    setAddInitialQuery("");
    resetBodyScroll();
    if (searchParams.get("add") || searchParams.get("q")) {
      router.replace("/nutrition");
    }
  }, [router, searchParams]);

  const onFoodAdded = useCallback(() => {
    closeSearchPopup();
    setAddSheetMeal(null);
    setQuickMeal(null);
    refreshFoodHistoryCache();
    toast.success("Lebensmittel hinzugefügt ✓", { duration: 1600 });
    const home = getCached<HomeDataPayload>(HOME_DATA_CACHE_KEY);
    const days = home?.nutritionStreak?.currentDays;
    if (typeof days === "number") setStreakDays(days);
  }, [closeSearchPopup]);

  const { quickAdd, adding: quickAdding } = useFoodQuickAdd({
    dashboard,
    applyDashboard,
    onSuccess: onFoodAdded,
  });

  const handleAddAction = useCallback(
    (action: NutritionAddAction) => {
      const meal = addSheetMeal ?? mealTypeForHour();
      setAddSheetMeal(null);
      resetBodyScroll();
      if (action === "search") {
        setSearchMeal(meal);
        return;
      }
      if (action === "photo") {
        setFoodAIOpen(true);
        return;
      }
      if (action === "quick") {
        setQuickMeal(meal);
        return;
      }
      if (action === "recipes") {
        router.push("/rezepte");
      }
    },
    [addSheetMeal, router]
  );

  const removeItem = useCallback(
    async (itemId: string) => {
      if (itemId.startsWith("opt-")) {
        toast.message("Eintrag wird noch gespeichert — kurz warten");
        return;
      }
      const snapshot = dashboardRef.current;
      const optimistic = optimisticRemoveMealItem(snapshot, itemId);
      if (optimistic) applyOptimistic(optimistic);
      const res = await fetch(`/api/nutrition/items/${itemId}`, { method: "DELETE" });
      if (!res.ok) {
        reload();
        toast.error("Löschen fehlgeschlagen");
        return;
      }
      const updated = await applyNutritionMutationResponse(res);
      if (!updated) reload();
      else dashboardRef.current = updated;
    },
    [applyOptimistic, reload]
  );

  const deleteMeal = useCallback(
    async (mealId: string) => {
      if (mealId.startsWith("opt-")) {
        toast.message("Mahlzeit wird noch gespeichert — kurz warten");
        return;
      }
      const snapshot = dashboardRef.current;
      const optimistic = optimisticRemoveMeal(snapshot, mealId);
      if (optimistic) applyOptimistic(optimistic);
      const res = await fetch(`/api/nutrition/meals/${mealId}`, { method: "DELETE" });
      if (!res.ok) {
        reload();
        toast.error("Mahlzeit konnte nicht gelöscht werden");
        return;
      }
      const updated = await applyNutritionMutationResponse(res);
      if (!updated) reload();
      else {
        dashboardRef.current = updated;
        toast.success("Mahlzeit gelöscht");
      }
    },
    [applyOptimistic, reload]
  );

  const requestDeleteMeal = useCallback((mealId: string, label: string) => {
    setPendingDelete({ mealId, label });
  }, []);

  const confirmDeleteMeal = useCallback(() => {
    if (!pendingDelete) return;
    const { mealId } = pendingDelete;
    setPendingDelete(null);
    void deleteMeal(mealId);
  }, [pendingDelete, deleteMeal]);

  const editItemQuantity = useCallback(
    async (itemId: string, quantityG: number) => {
      if (!Number.isFinite(quantityG) || quantityG <= 0) {
        toast.error("Ungültige Menge");
        return;
      }
      const snapshot = dashboardRef.current;
      const optimistic = optimisticPatchItemQuantity(snapshot, itemId, quantityG);
      if (optimistic) applyOptimistic(optimistic);
      const res = await fetch(`/api/nutrition/items/${itemId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ quantityG }),
      });
      if (!res.ok) {
        reload();
        toast.error("Speichern fehlgeschlagen");
        return;
      }
      const updated = await applyNutritionMutationResponse(res);
      if (!updated) reload();
      else dashboardRef.current = updated;
    },
    [applyOptimistic, reload]
  );

  const addWater = useCallback(
    async (amountMl: number) => {
      if (amountMl === 0) return;
      const snapshot = dashboardRef.current;
      const optimistic = optimisticAddWater(snapshot, amountMl);
      if (optimistic) applyOptimistic(optimistic);
      const res = await fetch("/api/nutrition/water", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amountMl }),
      });
      if (!res.ok) {
        reload();
        toast.error("Wasser konnte nicht gespeichert werden");
        return;
      }
      const updated = await applyNutritionMutationResponse(res);
      if (!updated) reload();
      else dashboardRef.current = updated;
    },
    [applyOptimistic, reload]
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

  const handleLogSavedMeal = useCallback(
    async (recipeId: string, mealType: MealType) => {
      const logMealType: MealType =
        mealType === "BREAKFAST" ||
        mealType === "LUNCH" ||
        mealType === "DINNER" ||
        mealType === "SNACK"
          ? mealType
          : "SNACK";

      const cached = getCachedSavedMeals()?.find((m) => m.id === recipeId);
      const macros = cached?.macros?.perServing ?? cached?.macros?.total;
      const base = dashboardRef.current;
      if (cached && macros) {
        const quantityG =
          cached.ingredients?.reduce((sum, i) => sum + (i.quantityG || 0), 0) ||
          100;
        const optimistic = optimisticAddSavedMeal(
          base,
          {
            name: cached.name,
            calories: macros.calories,
            proteinG: macros.proteinG,
            carbsG: macros.carbsG,
            fatG: macros.fatG,
            quantityG,
          },
          logMealType
        );
        if (optimistic) applyOptimistic(optimistic);
      }

      closeSearchPopup();
      toast.success("Mahlzeit hinzugefügt ✓", { duration: 1600 });

      void (async () => {
        try {
          const res = await fetch(`/api/nutrition/recipes/${recipeId}/log`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "same-origin",
            body: JSON.stringify({ mealType: logMealType }),
          });
          if (!res.ok) {
            reload();
            const err = await res.json().catch(() => ({}));
            toast.error(
              (err as { error?: string }).error ??
                "Mahlzeit konnte nicht hinzugefügt werden — Eintrag wurde zurückgesetzt"
            );
            return;
          }
          const updated = await applyNutritionMutationResponse(res);
          if (!updated) reload();
          else dashboardRef.current = updated;
          refreshFoodHistoryCache();
          const home = getCached<HomeDataPayload>(HOME_DATA_CACHE_KEY);
          const days = home?.nutritionStreak?.currentDays;
          if (typeof days === "number") setStreakDays(days);
        } catch {
          reload();
          toast.error("Netzwerkfehler — Eintrag wurde zurückgesetzt");
        }
      })();
    },
    [applyOptimistic, closeSearchPopup, reload]
  );

  const handleFoodAITrack = useCallback(
    async (items: FoodAIItem[], mealType: MealType) => {
      let nextDash = dashboardRef.current;
      for (const item of items) {
        const product = {
          name: item.name,
          calories: item.calories,
          proteinG: item.proteinG,
          carbsG: item.carbsG,
          fatG: item.fatG,
          fiberG: null,
          servingG: item.estimatedGrams || 100,
        };
        const optimistic = optimisticAddMealItem(
          nextDash,
          product,
          item.estimatedGrams,
          mealType
        );
        if (optimistic) {
          nextDash = optimistic;
          applyOptimistic(optimistic);
        }
      }
      try {
        for (const item of items) {
          const res = await fetch("/api/nutrition/log", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "same-origin",
            body: JSON.stringify({
              mealType,
              foodItemId: null,
              name: item.name,
              quantityG: item.estimatedGrams,
              calories: item.calories,
              proteinG: item.proteinG,
              carbsG: item.carbsG,
              fatG: item.fatG,
              source: "food-ai",
            }),
          });
          if (res.ok) {
            const updated = await applyNutritionMutationResponse(res);
            if (updated) {
              nextDash = updated;
              dashboardRef.current = updated;
              applyDashboard(updated);
            }
          } else {
            reload();
            toast.error("Mahlzeit konnte nicht gespeichert werden — Eintrag wurde zurückgesetzt");
            throw new Error("log failed");
          }
        }
      } catch (err) {
        if (err instanceof Error && err.message === "log failed") throw err;
        reload();
        throw err;
      }
      refreshFoodHistoryCache();
      const home = getCached<HomeDataPayload>(HOME_DATA_CACHE_KEY);
      const days = home?.nutritionStreak?.currentDays;
      if (typeof days === "number") setStreakDays(days);
      toast.success("Mahlzeit hinzugefügt ✓", { duration: 2000 });
    },
    [applyOptimistic, applyDashboard, reload]
  );

  return (
    <PageShell
      className="nutrition-mobile-page keyboard-stable-page pb-28 space-y-3"
      bottomNav={false}
      maxWidth="full"
    >
      <header className="flex items-center gap-2 min-h-11">
        <div className="flex-1 min-w-0">
          <h1 className="text-lg font-semibold text-white tracking-tight">Ernährung</h1>
          {streakDays > 0 ? (
            <p className="text-[11px] text-zinc-500 tabular-nums mt-0.5">
              {streakDays} Tage Ernährung
            </p>
          ) : null}
        </div>
        <button
          type="button"
          className="h-11 w-11 rounded-full text-zinc-400 hover:text-white inline-flex items-center justify-center"
          aria-label="Aktualisieren"
          onClick={() => reload()}
        >
          <RefreshCw className="h-4 w-4" />
        </button>
        <span className="sr-only" aria-hidden>
          <AlertCircle className="h-0 w-0" />
        </span>
        <button
          type="button"
          className="h-11 px-3 rounded-full border border-white/[0.08] text-zinc-300 hover:text-white inline-flex items-center justify-center gap-1.5 text-xs font-medium"
          aria-label="Foto aufnehmen"
          onClick={() => setFoodAIOpen(true)}
        >
          <Camera className="h-4 w-4" />
          <span className="hidden xs:inline sm:inline">Foto</span>
        </button>
        <Link
          href="/settings"
          className="h-11 px-3 rounded-full text-xs font-medium text-zinc-400 hover:text-white inline-flex items-center justify-center"
        >
          Einstellungen
        </Link>
      </header>

      {!dashboard?.profileComplete && (dashboard?.targets?.calories ?? 0) <= 0 && (
        <div className="rounded-2xl border border-white/[0.08] bg-zinc-900/40 px-4 py-3 text-sm text-zinc-300">
          Ziele fehlen —{" "}
          <Link href="/settings" className="underline font-medium text-white">
            Einstellungen öffnen
          </Link>
        </div>
      )}

      <NutritionOrbitOverview dashboard={dashboard} loading={loading && !dashboard} />

      <MealTrackList
        meals={dashboard?.mealsByType ?? []}
        onRemove={removeItem}
        onEdit={editItemQuantity}
        onDeleteMeal={requestDeleteMeal}
        onAddClick={(mealType) => setAddSheetMeal(mealType)}
      />

      <WaterTracker
        consumedMl={dashboard?.water?.consumedMl ?? 0}
        targetMl={dashboard?.water?.targetMl ?? 2500}
        onAdd={addWater}
      />

      {addSheetMeal && (
        <NutritionAddSheet
          open
          onClose={() => {
            setAddSheetMeal(null);
            resetBodyScroll();
          }}
          onAction={handleAddAction}
        />
      )}

      {searchMeal && (
        <FoodAddPopup
          open
          mealType={searchMeal}
          favoriteIds={favoriteIds}
          initialQuery={addInitialQuery}
          onClose={closeSearchPopup}
          onQuickAddFood={quickAdd}
          onToggleFavorite={handleToggleFavorite}
          onLogSavedMeal={handleLogSavedMeal}
          quickAdding={quickAdding}
          onOpenCamera={() => {
            closeSearchPopup();
            setFoodAIOpen(true);
          }}
        />
      )}

      {quickMeal && (
        <QuickEntrySheet
          open
          mealType={quickMeal}
          dashboard={dashboard}
          applyDashboard={applyDashboard}
          onClose={() => {
            setQuickMeal(null);
            resetBodyScroll();
          }}
          onSuccess={() => {
            refreshFoodHistoryCache();
            const home = getCached<HomeDataPayload>(HOME_DATA_CACHE_KEY);
            const days = home?.nutritionStreak?.currentDays;
            if (typeof days === "number") setStreakDays(days);
          }}
        />
      )}

      {foodAIOpen && (
        <FoodAISheet
          open={foodAIOpen}
          onClose={() => setFoodAIOpen(false)}
          onTrack={handleFoodAITrack}
        />
      )}

      {pendingDelete != null && (
        <ConfirmDialog
          open
          title="Mahlzeit löschen?"
          description={`"${pendingDelete.label}" wird aus deinem heutigen Ernährungstagebuch entfernt.`}
          confirmLabel="Löschen"
          cancelLabel="Abbrechen"
          destructive
          onConfirm={confirmDeleteMeal}
          onCancel={() => setPendingDelete(null)}
        />
      )}
    </PageShell>
  );
}
