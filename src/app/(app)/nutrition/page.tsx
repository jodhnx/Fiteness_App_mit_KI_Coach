"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import type { ElementType } from "react";
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
import { NutritionOrbitOverview } from "@/components/nutrition/nutrition-orbit-overview";
import { NutritionDaySummary } from "@/components/nutrition/nutrition-day-summary";
import { MealTrackList } from "@/components/nutrition/meal-track-list";
import { WaterTracker } from "@/components/nutrition/water-tracker";
import { FoodAddPopup } from "@/components/nutrition/food-add-popup";
import { FoodAISheet } from "@/components/nutrition/food-ai-sheet";
import {
  NutritionExtrasPanel,
  NutritionShoppingList,
} from "@/components/nutrition/nutrition-extras-panel";
import { PageIntro } from "@/components/guide/page-intro";
import { MEAL_TYPE_ORDER } from "@/lib/meal-types";
import type { MealType } from "@prisma/client";
import { toast } from "sonner";
import {
  RefreshCw,
  AlertCircle,
  Settings2,
  Camera,
  Search,
  Star,
  Clock,
  ChefHat,
  Pencil,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { warmNutritionSearchCaches } from "@/lib/nav-cache-warmer";
import { warmFoodHistoryCache, refreshFoodHistoryCache } from "@/lib/food-history-cache";
import { resetBodyScroll } from "@/lib/scroll-lock";
import { cn } from "@/lib/utils";
import type { FoodAIItem } from "@/app/api/nutrition/food-ai/route";

const VALID_MEALS = new Set<string>(MEAL_TYPE_ORDER);

type SmartAddOption = {
  id: string;
  icon: ElementType<{ className?: string }>;
  label: string;
  action: () => void;
  accent?: boolean;
};

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
  const [addInitialQuery, setAddInitialQuery] = useState("");
  const [foodAIOpen, setFoodAIOpen] = useState(false);
  const smartAddMeal: MealType = "LUNCH";

  useEffect(() => {
    // Prefetch + menu history so Favoriten / Häufig / Zuletzt open instantly
    warmNutritionSearchCaches();
    warmFoodHistoryCache(true);
  }, []);

  useEffect(() => {
    const add = searchParams.get("add");
    if (add && VALID_MEALS.has(add)) {
      setAddSheetMeal(add as MealType);
      setAddInitialQuery(searchParams.get("q")?.trim() ?? "");
    }
  }, [searchParams]);

  const { dashboard, error, timedOut, reload, applyDashboard } = useNutritionDashboard(120_000);

  const { favoriteIds, favoriteFoods, toggleFavorite } = useFoodFavorites();

  const closeAddPopup = useCallback(() => {
    setAddSheetMeal(null);
    setAddInitialQuery("");
    resetBodyScroll();
    if (searchParams.get("add") || searchParams.get("q")) {
      router.replace("/nutrition");
    }
  }, [router, searchParams]);

  const onFoodAdded = useCallback(() => {
    closeAddPopup();
    refreshFoodHistoryCache();
    toast.success("Lebensmittel hinzugefügt ✓", { duration: 1600 });
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

  const handleFoodAITrack = useCallback(
    async (items: FoodAIItem[], mealType: MealType) => {
      const snapshot = dashboard;
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
          if (updated) applyDashboard(updated);
        } else {
          applyDashboard(snapshot);
          toast.error("Mahlzeit konnte nicht gespeichert werden");
          throw new Error("log failed");
        }
      }
      refreshFoodHistoryCache();
      toast.success("Mahlzeit hinzugefügt ✓", { duration: 2000 });
    },
    [dashboard, applyDashboard]
  );

  const openSmartAdd = useCallback((meal: MealType) => {
    setAddSheetMeal(meal);
  }, []);

  const smartAddOptions: SmartAddOption[] = [
    {
      id: "photo",
      icon: Camera,
      label: "Essen fotografieren",
      action: () => setFoodAIOpen(true),
      accent: true,
    },
    {
      id: "search",
      icon: Search,
      label: "Lebensmittel suchen",
      action: () => openSmartAdd(smartAddMeal),
    },
    {
      id: "favorites",
      icon: Star,
      label: "Favoriten",
      action: () => openSmartAdd(smartAddMeal),
    },
    {
      id: "recent",
      icon: Clock,
      label: "Zuletzt verwendet",
      action: () => openSmartAdd(smartAddMeal),
    },
    {
      id: "recipe",
      icon: ChefHat,
      label: "Rezept hinzufügen",
      action: () => router.push("/nutrition/recipes"),
    },
    {
      id: "manual",
      icon: Pencil,
      label: "Manuell eingeben",
      action: () => openSmartAdd(smartAddMeal),
    },
  ];

  return (
    <PageShell
      title="Ernährung"
      className="nutrition-mobile-page keyboard-stable-page pb-28 space-y-2.5"
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

      {!dashboard?.profileComplete && (dashboard?.targets?.calories ?? 0) <= 0 && (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
          Ziele fehlen —{" "}
          <Link href="/settings" className="underline font-medium">
            Einstellungen öffnen
          </Link>
        </div>
      )}

      <NutritionOrbitOverview
        dashboard={dashboard}
        onAddMeal={(meal) => setAddSheetMeal(meal)}
      />

      {/* Smart Add — große klare Actions */}
      <div className="grid grid-cols-2 gap-2">
        {smartAddOptions.map((opt) => (
          <button
            key={opt.id}
            type="button"
            onClick={opt.action}
            className={cn(
              "flex items-center gap-2.5 rounded-2xl px-3.5 py-3.5 border text-left min-h-[52px] transition-colors active:scale-[0.98]",
              opt.accent
                ? "col-span-2 border-accent/40 bg-accent/15 text-accent"
                : "border-zinc-800/80 bg-zinc-900/70 text-zinc-200 hover:border-zinc-600"
            )}
          >
            <span
              className={cn(
                "h-9 w-9 rounded-xl flex items-center justify-center shrink-0",
                opt.accent ? "bg-accent/20" : "bg-zinc-800"
              )}
            >
              <opt.icon className="h-5 w-5" />
            </span>
            <span className={cn("text-sm font-semibold", opt.accent && "text-base")}>
              {opt.label}
            </span>
          </button>
        ))}
      </div>

      {/* Meal grid — direct, no section label needed */}
      <MealTrackList
        meals={dashboard?.mealsByType ?? []}
        onRemove={removeItem}
        onEdit={editItemQuantity}
        onDeleteMeal={deleteMeal}
        onAddClick={(mealType) => setAddSheetMeal(mealType)}
      />

      <NutritionDaySummary dashboard={dashboard} />

      <WaterTracker
        consumedMl={dashboard?.water?.consumedMl ?? 0}
        targetMl={dashboard?.water?.targetMl ?? 2500}
        onAdd={addWater}
      />

      <NutritionExtrasPanel />
      <NutritionShoppingList />
      <PageIntro pageId="nutrition" />

      {/* Food AI FAB — fixed, bottom-right, always on top */}
      <div
        className="fixed z-40"
        style={{
          bottom: "calc(5.5rem + env(safe-area-inset-bottom, 0px))",
          right: "1rem",
        }}
      >
        <button
          type="button"
          className="h-14 w-14 rounded-full bg-accent shadow-lg shadow-accent/30 flex items-center justify-center text-black transition-all active:scale-95"
          aria-label="Essen fotografieren"
          onClick={() => setFoodAIOpen(true)}
        >
          <Camera className="h-6 w-6" />
        </button>
      </div>

      {addSheetMeal && (
        <FoodAddPopup
          open
          mealType={addSheetMeal}
          favoriteIds={favoriteIds}
          initialQuery={addInitialQuery}
          onClose={closeAddPopup}
          onQuickAddFood={quickAdd}
          onToggleFavorite={handleToggleFavorite}
        />
      )}

      <FoodAISheet
        open={foodAIOpen}
        onClose={() => setFoodAIOpen(false)}
        onTrack={handleFoodAITrack}
      />
    </PageShell>
  );
}
