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
  HOME_DATA_EVENT,
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
import { RefreshCw } from "lucide-react";
import Link from "next/link";
import { refreshFoodHistoryCache } from "@/lib/food-history-cache";
import { resetBodyScroll } from "@/lib/scroll-lock";
import type { FoodAIItem } from "@/lib/food/food-ai-schema";
import { nutritionDayKey } from "@/lib/nutrition-day";
import { NutritionQuickActions } from "@/components/nutrition/nutrition-quick-actions";

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

const PANEL_RETURN_KEY = "nexform:food-panel-return";

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
  const [searchMeal, setSearchMeal] = useState<MealType | null>(null);
  const [quickMeal, setQuickMeal] = useState<MealType | null>(null);
  const [addInitialQuery, setAddInitialQuery] = useState("");
  const [addInitialView, setAddInitialView] = useState<
    "hub" | "favorites" | "search" | undefined
  >(undefined);
  const [foodAIOpen, setFoodAIOpen] = useState(false);
  const panelDeepLinkConsumed = useRef(false);
  const [panelReturnTo, setPanelReturnTo] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<{
    mealId: string;
    label: string;
  } | null>(null);
  const [streakDays, setStreakDays] = useState(0);

  useEffect(() => {
    const syncStreak = (home?: HomeDataPayload | null) => {
      const days =
        home?.nutritionStreak?.currentDays ??
        getCached<HomeDataPayload>(HOME_DATA_CACHE_KEY, { allowStale: true })
          ?.nutritionStreak?.currentDays;
      if (typeof days === "number") setStreakDays(days);
    };
    syncStreak();
    const onHome = (e: Event) => {
      syncStreak((e as CustomEvent<HomeDataPayload>).detail);
    };
    window.addEventListener(HOME_DATA_EVENT, onHome);
    return () => window.removeEventListener(HOME_DATA_EVENT, onHome);
  }, []);

  useEffect(() => {
    void import("@/components/nutrition/food-add-popup");
  }, []);

  useEffect(() => {
    const add = searchParams.get("add");
    const panel = searchParams.get("panel");
    const from = searchParams.get("from");
    const photo = searchParams.get("photo");
    const quick = searchParams.get("quick");
    if (photo === "1") {
      setFoodAIOpen(true);
      router.replace("/nutrition", { scroll: false });
      return;
    }
    if (quick === "1") {
      setQuickMeal(mealTypeForHour());
      router.replace("/nutrition", { scroll: false });
      return;
    }
    if (add && VALID_MEALS.has(add)) {
      panelDeepLinkConsumed.current = false;
      setPanelReturnTo(null);
      try {
        sessionStorage.removeItem(PANEL_RETURN_KEY);
      } catch {
        /* ignore */
      }
      setSearchMeal(add as MealType);
      setAddInitialQuery(searchParams.get("q")?.trim() ?? "");
      setAddInitialView("search");
      return;
    }
    if (panel === "food" || panel === "saved" || panel === "favorites") {
      if (panelDeepLinkConsumed.current) return;
      panelDeepLinkConsumed.current = true;
      const returnTo = from === "more" ? "/more" : null;
      setPanelReturnTo(returnTo);
      try {
        if (returnTo) sessionStorage.setItem(PANEL_RETURN_KEY, returnTo);
        else sessionStorage.removeItem(PANEL_RETURN_KEY);
      } catch {
        /* ignore */
      }
      setSearchMeal(mealTypeForHour());
      setAddInitialQuery("");
      setAddInitialView("favorites");
      // Strip query immediately so Keep-Alive remount / back navigation cannot reopen the sheet.
      router.replace("/nutrition", { scroll: false });
      return;
    }
  }, [searchParams, router]);

  // Survive remount: restore return path from sessionStorage
  useEffect(() => {
    if (panelReturnTo) return;
    try {
      const stored = sessionStorage.getItem(PANEL_RETURN_KEY);
      if (stored === "/more") setPanelReturnTo("/more");
    } catch {
      /* ignore */
    }
  }, [panelReturnTo]);

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

  const dismissSearchPanel = useCallback(
    (opts?: { followReturn?: boolean }) => {
      const followReturn = opts?.followReturn !== false;
      panelDeepLinkConsumed.current = true;
      setSearchMeal(null);
      setAddInitialQuery("");
      setAddInitialView(undefined);
      resetBodyScroll();
      let returnTo = panelReturnTo;
      if (!returnTo) {
        try {
          const stored = sessionStorage.getItem(PANEL_RETURN_KEY);
          if (stored === "/more") returnTo = "/more";
        } catch {
          /* ignore */
        }
      }
      setPanelReturnTo(null);
      try {
        sessionStorage.removeItem(PANEL_RETURN_KEY);
      } catch {
        /* ignore */
      }
      if (followReturn && returnTo) {
        router.replace(returnTo, { scroll: false });
      } else if (
        searchParams.get("add") ||
        searchParams.get("q") ||
        searchParams.get("panel") ||
        searchParams.get("from")
      ) {
        router.replace("/nutrition", { scroll: false });
      }
      window.setTimeout(() => {
        panelDeepLinkConsumed.current = false;
      }, 400);
    },
    [router, searchParams, panelReturnTo]
  );

  /** X / Zurück: honor More deep-link return target. */
  const closeSearchPopup = useCallback(() => {
    dismissSearchPanel({ followReturn: true });
  }, [dismissSearchPanel]);

  /** Successful add: stay on Nutrition so the logged meal is visible. */
  const onFoodAdded = useCallback(() => {
    dismissSearchPanel({ followReturn: false });
    setQuickMeal(null);
    refreshFoodHistoryCache();
    toast.success("Lebensmittel hinzugefügt ✓", { duration: 1600 });
    const home = getCached<HomeDataPayload>(HOME_DATA_CACHE_KEY);
    const days = home?.nutritionStreak?.currentDays;
    if (typeof days === "number") setStreakDays(days);
  }, [dismissSearchPanel]);

  const { quickAdd, adding: quickAdding } = useFoodQuickAdd({
    dashboard,
    applyDashboard,
    onSuccess: onFoodAdded,
  });

  const openFoodSearch = useCallback((meal?: MealType) => {
    setSearchMeal(meal ?? mealTypeForHour());
    setAddInitialQuery("");
    setAddInitialView("search");
  }, []);

  const openQuickEntry = useCallback((meal?: MealType) => {
    setQuickMeal(meal ?? mealTypeForHour());
  }, []);

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

  const foodAiSaveLockRef = useRef(false);

  const handleFoodAITrack = useCallback(
    async (items: FoodAIItem[], mealType: MealType) => {
      if (foodAiSaveLockRef.current) {
        throw new Error("save in flight");
      }
      if (!items.length) {
        throw new Error("no items");
      }
      foodAiSaveLockRef.current = true;
      const previousDash = dashboardRef.current;
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
        const day = nutritionDayKey();
        const res = await fetch("/api/nutrition/log", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "same-origin",
          body: JSON.stringify({
            mealType,
            source: "food-ai",
            date: day,
            items: items.map((item) => ({
              name: item.name,
              quantityG: item.estimatedGrams,
              calories: item.calories,
              proteinG: item.proteinG,
              carbsG: item.carbsG,
              fatG: item.fatG,
            })),
          }),
        });
        if (!res.ok) {
          if (previousDash) applyDashboard(previousDash);
          else reload();
          toast.error("Mahlzeit konnte nicht gespeichert werden");
          throw new Error("log failed");
        }
        const updated = await applyNutritionMutationResponse(res);
        if (updated) {
          dashboardRef.current = updated;
          applyDashboard(updated);
        } else {
          reload();
        }
      } catch (err) {
        foodAiSaveLockRef.current = false;
        if (err instanceof Error && err.message === "log failed") throw err;
        if (previousDash) applyDashboard(previousDash);
        else reload();
        throw err;
      }
      foodAiSaveLockRef.current = false;
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
      className="nutrition-mobile-page keyboard-stable-page pb-28 space-y-2.5"
      bottomNav={false}
      maxWidth="full"
    >
      <header className="flex items-center gap-2 min-h-11">
        <div className="flex-1 min-w-0">
          <h1 className="text-lg font-semibold tracking-tight text-zinc-900 dark:text-white">
            Ernährung
          </h1>
          {streakDays > 0 ? (
            <p className="text-[11px] text-zinc-500 tabular-nums mt-0.5">
              🔥 {streakDays} {streakDays === 1 ? "Tag" : "Tage"}
            </p>
          ) : null}
        </div>
        <button
          type="button"
          className="h-11 w-11 rounded-full text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white inline-flex items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60"
          aria-label="Aktualisieren"
          onClick={() => reload()}
        >
          <RefreshCw className="h-4 w-4" />
        </button>
        <Link
          href="/settings"
          className="h-11 px-3 rounded-full text-xs font-medium text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white inline-flex items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60"
        >
          Einstellungen
        </Link>
      </header>

      <div
        data-nutrition-layout="single-v2"
        className="flex flex-col gap-3 lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(260px,320px)] lg:gap-x-8 lg:gap-y-5 lg:items-start"
      >
        <div className="min-w-0 lg:col-start-1 lg:row-start-1">
          <NutritionOrbitOverview
            dashboard={dashboard}
            loading={loading}
          />
        </div>

        <div className="min-w-0 lg:col-start-2 lg:row-start-1 lg:sticky lg:top-4 space-y-2">
          <p className="hidden lg:block text-[10px] font-semibold uppercase tracking-[0.14em] text-zinc-500 px-0.5">
            Schnellaktionen
          </p>
          <NutritionQuickActions
            layout="responsive"
            onAddFood={() => openFoodSearch()}
            onQuickEntry={() => openQuickEntry()}
            onPhoto={() => setFoodAIOpen(true)}
            onRecipes={() => router.push("/rezepte")}
          />
        </div>

        <div className="min-w-0 lg:col-start-1 lg:row-start-2">
          <MealTrackList
            meals={dashboard?.mealsByType ?? []}
            mealTypes={["BREAKFAST", "LUNCH", "DINNER", "SNACK"]}
            onRemove={removeItem}
            onEdit={editItemQuantity}
            onDeleteMeal={requestDeleteMeal}
            onAddClick={(mealType) => openFoodSearch(mealType)}
          />
        </div>

        <div className="min-w-0 pt-1 lg:pt-0 lg:col-start-2 lg:row-start-2 lg:sticky lg:top-4">
          <WaterTracker
            consumedMl={dashboard?.water?.consumedMl ?? 0}
            targetMl={dashboard?.water?.targetMl ?? 2500}
            onAdd={addWater}
          />
        </div>
      </div>

      {searchMeal && (
        <FoodAddPopup
          open
          mealType={searchMeal}
          favoriteIds={favoriteIds}
          initialQuery={addInitialQuery}
          initialView={addInitialView}
          backLabel={panelReturnTo === "/more" ? "Mehr" : undefined}
          onClose={closeSearchPopup}
          onQuickAddFood={quickAdd}
          onToggleFavorite={handleToggleFavorite}
          onLogSavedMeal={handleLogSavedMeal}
          quickAdding={quickAdding}
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
          onManualAdd={() => {
            setFoodAIOpen(false);
            openFoodSearch();
          }}
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
