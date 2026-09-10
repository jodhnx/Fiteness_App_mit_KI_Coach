"use client";

import { memo, useCallback, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import type { MealType } from "@prisma/client";
import { X } from "lucide-react";
import { MEAL_TYPE_LABELS, TRACK_MEAL_ORDER } from "@/lib/meal-types";
import { useBodyScrollLock } from "@/hooks/use-body-scroll-lock";
import { resetBodyScroll } from "@/lib/scroll-lock";
import { nutritionDayKey } from "@/lib/nutrition-day";
import {
  applyNutritionMutationResponse,
  optimisticAddMealItem,
} from "@/lib/nutrition-sync";
import type { NutritionDashboardPayload } from "@/lib/nutrition-defaults";
import { toast } from "sonner";

const MAX_KCAL = 10_000;
const MAX_MACRO_G = 1_000;

type Props = {
  open: boolean;
  mealType: MealType;
  dashboard: NutritionDashboardPayload | null | undefined;
  applyDashboard: (next: NutritionDashboardPayload) => void;
  onClose: () => void;
  onSuccess?: () => void;
};

function parseNonNeg(raw: string, max: number): number | null {
  const t = raw.trim().replace(",", ".");
  if (t === "") return 0;
  const n = Number(t);
  if (!Number.isFinite(n) || n < 0 || n > max) return null;
  return n;
}

/** Manual calorie/macro entry without picking a food product. */
export const QuickEntrySheet = memo(function QuickEntrySheet({
  open,
  mealType: initialMeal,
  dashboard,
  applyDashboard,
  onClose,
  onSuccess,
}: Props) {
  const [mounted, setMounted] = useState(false);
  const [mealType, setMealType] = useState<MealType>(initialMeal);
  const [calories, setCalories] = useState("");
  const [protein, setProtein] = useState("");
  const [carbs, setCarbs] = useState("");
  const [fat, setFat] = useState("");
  const [saving, setSaving] = useState(false);
  useBodyScrollLock(open);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) return;
    setMealType(initialMeal);
    setCalories("");
    setProtein("");
    setCarbs("");
    setFat("");
    setSaving(false);
  }, [open, initialMeal]);

  const close = useCallback(() => {
    resetBodyScroll();
    onClose();
  }, [onClose]);

  const submit = useCallback(async () => {
    if (saving) return;
    const kcal = parseNonNeg(calories, MAX_KCAL);
    const p = parseNonNeg(protein, MAX_MACRO_G);
    const c = parseNonNeg(carbs, MAX_MACRO_G);
    const f = parseNonNeg(fat, MAX_MACRO_G);
    if (kcal == null || p == null || c == null || f == null) {
      toast.error("Bitte gültige Werte eingeben (0 oder positiv).");
      return;
    }
    if (kcal === 0 && p === 0 && c === 0 && f === 0) {
      toast.error("Mindestens Kalorien oder ein Makro angeben.");
      return;
    }

    setSaving(true);
    const snapshot = dashboard ?? null;
    const product = {
      name: "Schnelleintrag",
      brand: null as string | null,
      calories: kcal,
      proteinG: p,
      carbsG: c,
      fatG: f,
      fiberG: null as number | null,
      servingG: 100,
      source: "local" as const,
    };
    if (snapshot) {
      const optimistic = optimisticAddMealItem(snapshot, product, 100, mealType);
      if (optimistic) applyDashboard(optimistic);
    }
    onSuccess?.();
    close();

    try {
      const res = await fetch("/api/nutrition/log", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({
          mealType,
          name: "Schnelleintrag",
          quantityG: 100,
          calories: kcal,
          proteinG: p,
          carbsG: c,
          fatG: f,
          source: "quick-entry",
          date: nutritionDayKey(),
        }),
      });
      if (!res.ok) {
        if (snapshot) applyDashboard(snapshot);
        const err = await res.json().catch(() => ({}));
        toast.error(
          (err as { error?: string }).error ??
            "Schnelleintrag fehlgeschlagen — Eintrag zurückgesetzt"
        );
        return;
      }
      const updated = await applyNutritionMutationResponse(res);
      if (!updated && snapshot) applyDashboard(snapshot);
      toast.success("Schnelleintrag gespeichert ✓", { duration: 1600 });
    } catch {
      if (snapshot) applyDashboard(snapshot);
      toast.error("Netzwerkfehler — Eintrag zurückgesetzt");
    } finally {
      setSaving(false);
    }
  }, [
    saving,
    calories,
    protein,
    carbs,
    fat,
    mealType,
    dashboard,
    applyDashboard,
    onSuccess,
    close,
  ]);

  if (!mounted || !open) return null;

  const fields: { label: string; value: string; set: (v: string) => void; unit: string; mode: "numeric" | "decimal" }[] = [
    { label: "Kalorien", value: calories, set: setCalories, unit: "kcal", mode: "numeric" },
    { label: "Protein", value: protein, set: setProtein, unit: "g", mode: "decimal" },
    { label: "Carbs", value: carbs, set: setCarbs, unit: "g", mode: "decimal" },
    { label: "Fett", value: fat, set: setFat, unit: "g", mode: "decimal" },
  ];

  return createPortal(
    <div
      className="fixed inset-0 z-[210] flex flex-col justify-end"
      role="dialog"
      aria-modal="true"
      aria-label="Schnell eintragen"
    >
      <button
        type="button"
        className="absolute inset-0 bg-black/55"
        aria-label="Schließen"
        onClick={close}
      />
      <div className="relative mx-auto w-full max-w-lg px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
        <div className="rounded-[1.35rem] border border-white/[0.1] bg-zinc-950/95 backdrop-blur-xl shadow-2xl overflow-hidden">
          <div className="flex items-center justify-between px-4 pt-3.5 pb-2">
            <div>
              <p className="text-sm font-semibold text-white">Schnell eintragen</p>
              <p className="text-xs text-zinc-500 mt-0.5">Ohne Lebensmittel wählen</p>
            </div>
            <button
              type="button"
              onClick={close}
              className="h-11 w-11 inline-flex items-center justify-center rounded-full text-zinc-400"
              aria-label="Schließen"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="px-4 pb-4 space-y-3">
            <label className="block space-y-1.5">
              <span className="text-xs font-medium text-zinc-500">Mahlzeit</span>
              <select
                value={mealType}
                onChange={(e) => setMealType(e.target.value as MealType)}
                className="h-12 w-full rounded-xl border border-white/10 bg-zinc-900 px-3 text-sm text-white"
                aria-label="Mahlzeit"
              >
                {TRACK_MEAL_ORDER.map((m) => (
                  <option key={m} value={m}>
                    {MEAL_TYPE_LABELS[m]}
                  </option>
                ))}
              </select>
            </label>

            <div className="grid grid-cols-2 gap-2.5">
              {fields.map((f) => (
                <label key={f.label} className="block space-y-1.5">
                  <span className="text-xs font-medium text-zinc-500">{f.label}</span>
                  <span className="flex items-center gap-2 h-12 rounded-xl border border-white/10 bg-zinc-900 px-3">
                    <input
                      type="text"
                      inputMode={f.mode}
                      value={f.value}
                      onChange={(e) =>
                        f.set(e.target.value.replace(/[^0-9.,]/g, ""))
                      }
                      placeholder="0"
                      className="min-w-0 flex-1 bg-transparent text-base text-white tabular-nums outline-none"
                      aria-label={f.label}
                    />
                    <span className="text-xs text-zinc-500 shrink-0">{f.unit}</span>
                  </span>
                </label>
              ))}
            </div>

            <button
              type="button"
              disabled={saving}
              onClick={() => void submit()}
              className="flex w-full min-h-12 items-center justify-center rounded-xl bg-white text-zinc-950 text-sm font-semibold disabled:opacity-50"
            >
              {saving ? "Speichern…" : "Schnell eintragen"}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
});
