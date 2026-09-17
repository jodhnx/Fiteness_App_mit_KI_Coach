"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import {
  Copy,
  Plus,
  Trash2,
  UtensilsCrossed,
  CheckCircle2,
} from "lucide-react";
import { PageShell } from "@/components/layout/page-shell";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { MEAL_TYPE_LABELS } from "@/lib/meal-types";
import type { MealType } from "@prisma/client";
import type { PlanDetailDto, PlanDayDto, PlanMealDto } from "@/lib/nutrition-plan-types";
import { PLAN_MEAL_TYPES } from "@/lib/nutrition-plan-constants";
import {
  readPlanCache,
  writePlanCache,
  invalidateNutritionPlanCaches,
  syncActivePlanSummaryFromDetail,
} from "@/lib/nutrition-plan-cache";
import type { FoodProduct } from "@/lib/food/food-product-types";
import { useFoodFavorites } from "@/hooks/use-food-favorites";
import { applyNutritionMutationResponse } from "@/lib/nutrition-sync";

const FoodAddPopup = dynamic(
  () =>
    import("@/components/nutrition/food-add-popup").then((m) => m.FoodAddPopup),
  { ssr: false }
);

export default function NutritionPlanEditorPage() {
  const params = useParams();
  const router = useRouter();
  const planId = String(params.id ?? "");
  const cached = useRef(planId ? readPlanCache(planId) : null).current;
  const [plan, setPlan] = useState<PlanDetailDto | null>(cached);
  const [loading, setLoading] = useState(!cached);
  const [dayNumber, setDayNumber] = useState(1);
  const [addMealId, setAddMealId] = useState<string | null>(null);
  const [addMealType, setAddMealType] = useState<MealType>("BREAKFAST");
  const [showMealPicker, setShowMealPicker] = useState(false);
  const [showWeek, setShowWeek] = useState(false);
  const [busy, setBusy] = useState(false);
  const addLock = useRef(false);
  const { favoriteIds, toggleFavorite } = useFoodFavorites();

  const applyPlan = useCallback((next: PlanDetailDto) => {
    setPlan(next);
    writePlanCache(next);
    syncActivePlanSummaryFromDetail(next);
  }, []);

  const load = useCallback(
    async (soft = false) => {
      if (!planId) return;
      if (!soft) setLoading(true);
      try {
        const res = await fetch(`/api/nutrition/plans/${planId}`, {
          credentials: "include",
        });
        if (res.status === 404) {
          toast.error("Plan nicht gefunden");
          router.replace("/nutrition/plans");
          return;
        }
        if (!res.ok) throw new Error("load");
        const data = (await res.json()) as { plan: PlanDetailDto };
        applyPlan(data.plan);
      } catch {
        if (!plan) toast.error("Plan konnte nicht geladen werden");
      } finally {
        setLoading(false);
      }
    },
    [planId, applyPlan, router, plan]
  );

  useEffect(() => {
    void load(Boolean(cached));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [planId]);

  const day: PlanDayDto | null = useMemo(() => {
    if (!plan) return null;
    return plan.days.find((d) => d.dayNumber === dayNumber) ?? plan.days[0] ?? null;
  }, [plan, dayNumber]);

  async function postJson(url: string, body: unknown, method = "POST") {
    setBusy(true);
    try {
      const res = await fetch(url, {
        method,
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        toast.error((err as { error?: string }).error ?? "Aktion fehlgeschlagen");
        return null;
      }
      const data = (await res.json()) as { plan?: PlanDetailDto };
      if (data.plan) {
        applyPlan(data.plan);
        invalidateNutritionPlanCaches(planId);
      }
      return data;
    } catch {
      toast.error("Netzwerkfehler");
      return null;
    } finally {
      setBusy(false);
    }
  }

  const handleAddFood = useCallback(
    async (product: FoodProduct, quantityG: number, meal: MealType) => {
      if (!addMealId || addLock.current) return;
      addLock.current = true;
      try {
        const confirmed = {
          name: product.name,
          brand: product.brand ?? null,
          calories: 0,
          proteinG: 0,
          carbsG: 0,
          fatG: 0,
        };
        // Prefer foodItemId path for correct macros from DB
        const body = product.id
          ? {
              mealId: addMealId,
              foodItemId: product.id,
              quantityG,
            }
          : {
              mealId: addMealId,
              quantityG,
              nameSnapshot: product.name,
              brandSnapshot: product.brand ?? null,
              confirmed: {
                name: product.name,
                brand: product.brand ?? null,
                calories: Math.round(
                  (product.calories * quantityG) / (product.servingG || 100)
                ),
                proteinG:
                  Math.round(
                    ((product.proteinG * quantityG) / (product.servingG || 100)) *
                      10
                  ) / 10,
                carbsG:
                  Math.round(
                    ((product.carbsG * quantityG) / (product.servingG || 100)) * 10
                  ) / 10,
                fatG:
                  Math.round(
                    ((product.fatG * quantityG) / (product.servingG || 100)) * 10
                  ) / 10,
              },
            };
        void confirmed;
        void meal;
        const res = await fetch(`/api/nutrition/plans/${planId}/items`, {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        if (!res.ok) {
          toast.error("Konnte nicht zum Plan hinzugefügt werden");
          return;
        }
        const data = (await res.json()) as { plan: PlanDetailDto };
        applyPlan(data.plan);
        invalidateNutritionPlanCaches(planId);
        toast.success("Zum Plan hinzugefügt");
        setAddMealId(null);
      } finally {
        addLock.current = false;
      }
    },
    [addMealId, planId, applyPlan]
  );

  const handleLogSavedMeal = useCallback(
    async (recipeId: string, meal: MealType) => {
      if (!addMealId) return;
      void meal;
      const res = await fetch(`/api/nutrition/plans/${planId}/items`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mealId: addMealId, savedMealId: recipeId }),
      });
      if (!res.ok) {
        toast.error("Gespeicherte Mahlzeit konnte nicht hinzugefügt werden");
        return;
      }
      const data = (await res.json()) as { plan: PlanDetailDto };
      applyPlan(data.plan);
      setAddMealId(null);
      toast.success("Zum Plan hinzugefügt");
    },
    [addMealId, planId, applyPlan]
  );

  async function addMealSlot(mealType: MealType) {
    if (!day) return;
    setShowMealPicker(false);
    await postJson(`/api/nutrition/plans/${planId}/meals`, {
      dayId: day.id,
      mealType,
    });
  }

  async function removeMeal(mealId: string) {
    if (!confirm("Mahlzeit entfernen?")) return;
    setBusy(true);
    try {
      const res = await fetch(
        `/api/nutrition/plans/${planId}/meals/${mealId}`,
        { method: "DELETE", credentials: "include" }
      );
      if (!res.ok) {
        toast.error("Löschen fehlgeschlagen");
        return;
      }
      const data = (await res.json()) as { plan: PlanDetailDto };
      applyPlan(data.plan);
    } finally {
      setBusy(false);
    }
  }

  async function removeItem(itemId: string) {
    setBusy(true);
    try {
      const res = await fetch(
        `/api/nutrition/plans/${planId}/items/${itemId}`,
        { method: "DELETE", credentials: "include" }
      );
      if (!res.ok) {
        toast.error("Löschen fehlgeschlagen");
        return;
      }
      const data = (await res.json()) as { plan: PlanDetailDto };
      applyPlan(data.plan);
    } finally {
      setBusy(false);
    }
  }

  async function updateQty(itemId: string, quantityG: number) {
    if (!(quantityG > 0)) return;
    await postJson(
      `/api/nutrition/plans/${planId}/items/${itemId}`,
      { quantityG },
      "PATCH"
    );
  }

  async function logAsEaten(itemId: string, mealType: MealType) {
    const res = await fetch(`/api/nutrition/plans/${planId}/items/${itemId}`, {
      method: "PATCH",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "log-eaten", mealType }),
    });
    if (!res.ok) {
      toast.error("Loggen fehlgeschlagen");
      return;
    }
    await applyNutritionMutationResponse(res);
    toast.success("Als gegessen markiert");
  }

  async function duplicateToNext() {
    if (!plan || !day) return;
    const next = plan.days.find((d) => d.dayNumber === day.dayNumber + 1);
    if (!next) {
      toast.error("Kein Folgetag vorhanden");
      return;
    }
    await postJson(`/api/nutrition/plans/${planId}/meals`, {
      action: "duplicate-day",
      sourceDayId: day.id,
      targetDayId: next.id,
    });
    setDayNumber(next.dayNumber);
    toast.success(`Tag ${day.dayNumber} → Tag ${next.dayNumber} kopiert`);
  }

  const targets = {
    calories: plan?.targetCalories ?? 0,
    proteinG: plan?.targetProteinG ?? 0,
    carbsG: plan?.targetCarbsG ?? 0,
    fatG: plan?.targetFatG ?? 0,
  };

  return (
    <PageShell maxWidth="2xl" className="space-y-3 pb-28" bottomNav={false}>
      <div className="flex items-start gap-2">
        <button
          type="button"
          onClick={() => router.push("/nutrition/plans")}
          className="mt-1 text-sm font-medium text-accent shrink-0"
        >
          ← Zurück
        </button>
        <div className="min-w-0 flex-1">
          <h1 className="text-xl font-bold text-zinc-900 dark:text-white truncate">
            {plan?.name ?? "Ernährungsplan"}
          </h1>
          <p className="text-[12px] text-zinc-500">
            Geplant ≠ gegessen — Foods werden erst geloggt, wenn du sie
            markierst.
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          className="min-h-10 rounded-xl text-xs shrink-0"
          onClick={() => setShowWeek((v) => !v)}
        >
          Übersicht
        </Button>
      </div>

      {loading && !plan ? (
        <div className="h-40 rounded-2xl bg-zinc-200/70 animate-pulse dark:bg-white/[0.04]" />
      ) : null}

      {plan ? (
        <>
          <div className="scrollbar-none -mx-0.5 flex gap-1.5 overflow-x-auto px-0.5 pb-1">
            {plan.days.map((d) => (
              <button
                key={d.id}
                type="button"
                onClick={() => setDayNumber(d.dayNumber)}
                className={cn(
                  "shrink-0 min-h-10 rounded-full border px-3.5 text-sm font-semibold",
                  dayNumber === d.dayNumber
                    ? "border-accent bg-accent text-white"
                    : "border-zinc-200 bg-white text-zinc-700 dark:border-white/[0.08] dark:bg-white/[0.03] dark:text-zinc-300"
                )}
              >
                Tag {d.dayNumber}
              </button>
            ))}
          </div>

          {showWeek ? (
            <WeekOverview plan={plan} onSelectDay={setDayNumber} />
          ) : null}

          {day ? (
            <DayEditor
              day={day}
              targets={targets}
              busy={busy}
              onAddFood={(meal) => {
                setAddMealType(meal.mealType);
                setAddMealId(meal.id);
              }}
              onRemoveMeal={removeMeal}
              onRemoveItem={removeItem}
              onUpdateQty={updateQty}
              onLogEaten={logAsEaten}
              onAddMealSlot={() => setShowMealPicker(true)}
              onDuplicateDay={() => void duplicateToNext()}
              onClearDay={() =>
                void postJson(`/api/nutrition/plans/${planId}/meals`, {
                  action: "clear",
                  dayId: day.id,
                })
              }
            />
          ) : null}
        </>
      ) : null}

      {showMealPicker ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center">
          <div className="w-full max-w-md rounded-2xl border border-zinc-200 bg-white p-4 space-y-2 dark:border-white/10 dark:bg-zinc-950">
            <p className="font-semibold text-zinc-900 dark:text-white">
              Mahlzeit hinzufügen
            </p>
            {PLAN_MEAL_TYPES.map((t) => (
              <button
                key={t}
                type="button"
                className="flex min-h-11 w-full items-center rounded-xl border border-zinc-200 px-3 text-left text-sm font-medium dark:border-white/[0.08]"
                onClick={() => void addMealSlot(t)}
              >
                {MEAL_TYPE_LABELS[t]}
              </button>
            ))}
            <Button
              type="button"
              variant="outline"
              className="w-full min-h-11"
              onClick={() => setShowMealPicker(false)}
            >
              Abbrechen
            </Button>
          </div>
        </div>
      ) : null}

      {addMealId ? (
        <FoodAddPopup
          open
          mealType={addMealType}
          favoriteIds={favoriteIds}
          onClose={() => setAddMealId(null)}
          onQuickAddFood={handleAddFood}
          onToggleFavorite={async (foodItemId) => {
            await toggleFavorite({ id: foodItemId } as FoodProduct);
          }}
          onLogSavedMeal={handleLogSavedMeal}
        />
      ) : null}
    </PageShell>
  );
}

function DayEditor({
  day,
  targets,
  busy,
  onAddFood,
  onRemoveMeal,
  onRemoveItem,
  onUpdateQty,
  onLogEaten,
  onAddMealSlot,
  onDuplicateDay,
  onClearDay,
}: {
  day: PlanDayDto;
  targets: { calories: number; proteinG: number; carbsG: number; fatG: number };
  busy: boolean;
  onAddFood: (meal: PlanMealDto) => void;
  onRemoveMeal: (id: string) => void;
  onRemoveItem: (id: string) => void;
  onUpdateQty: (id: string, qty: number) => void;
  onLogEaten: (id: string, mealType: MealType) => void;
  onAddMealSlot: () => void;
  onDuplicateDay: () => void;
  onClearDay: () => void;
}) {
  const over =
    targets.calories > 0 && day.totals.calories > targets.calories
      ? day.totals.calories - targets.calories
      : 0;
  const remaining =
    targets.calories > 0
      ? Math.max(0, targets.calories - day.totals.calories)
      : 0;

  return (
    <div className="space-y-3">
      <section className="rounded-2xl border border-zinc-200/90 bg-white p-3.5 shadow-sm dark:border-white/[0.08] dark:bg-white/[0.02]">
        <h2 className="text-sm font-semibold text-zinc-900 dark:text-white">
          Tag {day.dayNumber}
        </h2>
        <p className="mt-1 text-2xl font-bold tabular-nums text-zinc-900 dark:text-white">
          {Math.round(day.totals.calories).toLocaleString("de-DE")}
          {targets.calories > 0 ? (
            <span className="text-base font-medium text-zinc-500">
              {" "}
              / {targets.calories.toLocaleString("de-DE")} kcal
            </span>
          ) : (
            <span className="text-base font-medium text-zinc-500"> kcal</span>
          )}
        </p>
        {targets.calories > 0 ? (
          <p className="text-[12px] text-zinc-500 mt-0.5">
            {over > 0
              ? `${Math.round(over)} kcal über dem Ziel`
              : `Noch offen: ${Math.round(remaining)} kcal`}
          </p>
        ) : null}
        <div className="mt-3 grid grid-cols-3 gap-2">
          <MacroMini
            label="Protein"
            value={day.totals.proteinG}
            target={targets.proteinG}
          />
          <MacroMini
            label="Carbs"
            value={day.totals.carbsG}
            target={targets.carbsG}
          />
          <MacroMini
            label="Fett"
            value={day.totals.fatG}
            target={targets.fatG}
          />
        </div>
        <div className="mt-3 flex flex-wrap gap-1.5">
          <Button
            type="button"
            variant="outline"
            className="min-h-9 rounded-lg text-xs"
            disabled={busy}
            onClick={onDuplicateDay}
          >
            <Copy className="h-3.5 w-3.5 mr-1" />
            Tag duplizieren
          </Button>
          <Button
            type="button"
            variant="outline"
            className="min-h-9 rounded-lg text-xs"
            disabled={busy}
            onClick={onClearDay}
          >
            Tag leeren
          </Button>
          <Button
            type="button"
            className="min-h-9 rounded-lg text-xs btn-accent"
            onClick={onAddMealSlot}
          >
            <Plus className="h-3.5 w-3.5 mr-1" />
            Mahlzeit hinzufügen
          </Button>
        </div>
      </section>

      {day.meals.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-zinc-300 p-6 text-center dark:border-white/15">
          <UtensilsCrossed className="mx-auto h-8 w-8 text-zinc-400" />
          <p className="mt-2 text-sm font-medium text-zinc-700 dark:text-zinc-200">
            Für diesen Tag sind noch keine Mahlzeiten geplant.
          </p>
          <Button
            type="button"
            className="mt-3 min-h-11 rounded-xl btn-accent"
            onClick={onAddMealSlot}
          >
            Mahlzeit hinzufügen
          </Button>
        </div>
      ) : null}

      {day.meals.map((meal) => (
        <MealBlock
          key={meal.id}
          meal={meal}
          onAddFood={() => onAddFood(meal)}
          onRemoveMeal={() => onRemoveMeal(meal.id)}
          onRemoveItem={onRemoveItem}
          onUpdateQty={onUpdateQty}
          onLogEaten={(itemId) => onLogEaten(itemId, meal.mealType)}
        />
      ))}
    </div>
  );
}

function MealBlock({
  meal,
  onAddFood,
  onRemoveMeal,
  onRemoveItem,
  onUpdateQty,
  onLogEaten,
}: {
  meal: PlanMealDto;
  onAddFood: () => void;
  onRemoveMeal: () => void;
  onRemoveItem: (id: string) => void;
  onUpdateQty: (id: string, qty: number) => void;
  onLogEaten: (id: string) => void;
}) {
  return (
    <section className="rounded-2xl border border-zinc-200/90 bg-white p-3.5 shadow-sm dark:border-white/[0.08] dark:bg-white/[0.02]">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-sm font-semibold text-zinc-900 dark:text-white">
          {meal.title || MEAL_TYPE_LABELS[meal.mealType]}
        </h3>
        <button
          type="button"
          className="min-h-9 min-w-9 inline-flex items-center justify-center text-zinc-400 hover:text-red-500"
          aria-label="Mahlzeit entfernen"
          onClick={onRemoveMeal}
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>

      {meal.items.length === 0 ? (
        <p className="mt-2 text-[12px] text-zinc-500">Noch kein Essen geplant.</p>
      ) : (
        <ul className="mt-2 space-y-2">
          {meal.items.map((item) => (
            <li
              key={item.id}
              className="rounded-xl border border-zinc-100 bg-zinc-50/80 p-2.5 dark:border-white/[0.06] dark:bg-white/[0.03]"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-[13px] font-medium text-zinc-900 dark:text-white truncate">
                    {item.nameSnapshot}
                  </p>
                  <p className="text-[11px] text-zinc-500 tabular-nums">
                    {item.quantityG} {item.unit} · {Math.round(item.calories)}{" "}
                    kcal · P {item.proteinG}g
                  </p>
                </div>
                <div className="flex gap-1 shrink-0">
                  <button
                    type="button"
                    className="min-h-9 min-w-9 inline-flex items-center justify-center rounded-lg text-accent"
                    aria-label="Als gegessen markieren"
                    title="Als gegessen markieren"
                    onClick={() => onLogEaten(item.id)}
                  >
                    <CheckCircle2 className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    className="min-h-9 min-w-9 inline-flex items-center justify-center rounded-lg text-zinc-400 hover:text-red-500"
                    aria-label="Entfernen"
                    onClick={() => onRemoveItem(item.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
              <div className="mt-2 flex items-center gap-2">
                <label className="text-[11px] text-zinc-500">Menge (g)</label>
                <input
                  type="number"
                  inputMode="decimal"
                  className="h-9 w-24 rounded-lg border border-zinc-200 bg-white px-2 text-sm tabular-nums dark:border-white/10 dark:bg-black/30"
                  defaultValue={item.quantityG}
                  key={`${item.id}-${item.quantityG}`}
                  onBlur={(e) => {
                    const n = Number(e.target.value.replace(",", "."));
                    if (Number.isFinite(n) && n > 0 && n !== item.quantityG) {
                      onUpdateQty(item.id, n);
                    }
                  }}
                />
              </div>
            </li>
          ))}
        </ul>
      )}

      <div className="mt-2 flex items-center justify-between gap-2 text-[11px] tabular-nums text-zinc-500">
        <span>
          Gesamt: {Math.round(meal.totals.calories)} kcal · P{" "}
          {meal.totals.proteinG}g · C {meal.totals.carbsG}g · F {meal.totals.fatG}g
        </span>
      </div>

      <Button
        type="button"
        variant="outline"
        className="mt-2 min-h-10 w-full rounded-xl text-xs font-semibold"
        onClick={onAddFood}
      >
        <Plus className="h-3.5 w-3.5 mr-1" />
        Essen hinzufügen
      </Button>
    </section>
  );
}

function MacroMini({
  label,
  value,
  target,
}: {
  label: string;
  value: number;
  target: number;
}) {
  const pct =
    target > 0 ? Math.min(100, Math.round((value / target) * 100)) : 0;
  return (
    <div>
      <p className="text-[10px] uppercase tracking-wide text-zinc-500">{label}</p>
      <p className="text-sm font-semibold tabular-nums text-zinc-900 dark:text-white">
        {Math.round(value * 10) / 10}
        {target > 0 ? (
          <span className="text-zinc-500 font-medium"> / {target}g</span>
        ) : (
          "g"
        )}
      </p>
      <div className="mt-1 h-1.5 rounded-full bg-zinc-100 dark:bg-white/[0.06]">
        <div
          className="h-full rounded-full bg-accent"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

function WeekOverview({
  plan,
  onSelectDay,
}: {
  plan: PlanDetailDto;
  onSelectDay: (n: number) => void;
}) {
  return (
    <section className="rounded-2xl border border-zinc-200/90 bg-white p-3.5 space-y-2 shadow-sm dark:border-white/[0.08] dark:bg-white/[0.02]">
      <h2 className="text-sm font-semibold text-zinc-900 dark:text-white">
        Wochenübersicht
      </h2>
      <ul className="space-y-1">
        {plan.days.map((d) => (
          <li key={d.id}>
            <button
              type="button"
              className="flex w-full min-h-9 items-center justify-between rounded-lg px-2 text-sm hover:bg-zinc-50 dark:hover:bg-white/[0.04]"
              onClick={() => onSelectDay(d.dayNumber)}
            >
              <span>Tag {d.dayNumber}</span>
              <span className="tabular-nums text-zinc-600 dark:text-zinc-300">
                {Math.round(d.totals.calories).toLocaleString("de-DE")} kcal
              </span>
            </button>
          </li>
        ))}
      </ul>
      <div className="border-t border-zinc-100 pt-2 text-[12px] text-zinc-600 dark:border-white/[0.06] dark:text-zinc-300 space-y-0.5">
        <p>
          Durchschnitt:{" "}
          <strong className="tabular-nums">
            {Math.round(plan.weekAverage.calories).toLocaleString("de-DE")} kcal
          </strong>{" "}
          / Tag
        </p>
        <p>
          Protein Ø {Math.round(plan.weekAverage.proteinG)}g · Carbs Ø{" "}
          {Math.round(plan.weekAverage.carbsG)}g · Fett Ø{" "}
          {Math.round(plan.weekAverage.fatG)}g
        </p>
        <p>
          Geplante Mahlzeiten: {plan.totalMeals} · Foods: {plan.totalItems}
        </p>
      </div>
    </section>
  );
}
