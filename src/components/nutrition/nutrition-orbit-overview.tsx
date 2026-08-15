"use client";

import { memo } from "react";
import Link from "next/link";
import type { MealType } from "@prisma/client";
import type { NutritionDashboardPayload } from "@/lib/nutrition-defaults";
import { hasNutritionTargets, nutritionProfileIncomplete } from "@/lib/nutrition-defaults";
import { CalorieRing } from "@/components/nutrition/calorie-ring";
import { TRACK_MEAL_ORDER, MEAL_TYPE_LABELS } from "@/lib/meal-types";
import { cn } from "@/lib/utils";

const MEAL_EMOJI: Record<string, string> = {
  BREAKFAST: "🍳",
  LUNCH: "🍗",
  DINNER: "🥗",
  SNACK: "🍎",
};

const MEAL_POS: Record<string, string> = {
  BREAKFAST: "top-0 left-1/2 -translate-x-1/2",
  LUNCH: "top-1/2 right-0 -translate-y-1/2",
  DINNER: "bottom-0 left-1/2 -translate-x-1/2",
  SNACK: "top-1/2 left-0 -translate-y-1/2",
};

type Props = {
  dashboard: NutritionDashboardPayload;
  onAddMeal?: (meal: MealType) => void;
};

/** Calorie ring with personal target + meal slots arranged around it. */
export const NutritionOrbitOverview = memo(function NutritionOrbitOverview({
  dashboard,
  onAddMeal,
}: Props) {
  const { consumed, targets, remaining, mealsByType } = dashboard;
  const ready = hasNutritionTargets(dashboard);
  const incomplete = nutritionProfileIncomplete(dashboard);

  if (!ready) {
    return (
      <Link
        href="/settings"
        prefetch
        className="block rounded-2xl border border-zinc-800 bg-zinc-900/80 px-6 py-8 text-center"
      >
        <p className="text-sm text-zinc-300">
          {incomplete
            ? "Bitte Gewicht und Ziel vervollständigen"
            : "Kalorienziel wird berechnet…"}
        </p>
      </Link>
    );
  }

  const macros = [
    {
      key: "p",
      label: "Protein",
      value: Math.round(consumed.proteinG),
      target: Math.round(targets.proteinG),
      left: Math.round(remaining.proteinG),
      bar: "bg-rose-400",
      tint: "text-rose-400",
    },
    {
      key: "c",
      label: "Kohlenhydrate",
      value: Math.round(consumed.carbsG),
      target: Math.round(targets.carbsG),
      left: Math.round(remaining.carbsG),
      bar: "bg-amber-400",
      tint: "text-amber-400",
    },
    {
      key: "f",
      label: "Fett",
      value: Math.round(consumed.fatG),
      target: Math.round(targets.fatG),
      left: Math.round(remaining.fatG),
      bar: "bg-sky-400",
      tint: "text-sky-400",
    },
  ] as const;

  const slots = TRACK_MEAL_ORDER.map((type) => {
    const found = mealsByType.find((m) => m.mealType === type);
    const items = found?.items.length ?? 0;
    const kcal = Math.round(found?.totals.calories ?? 0);
    return { type, items, kcal, open: items === 0 };
  });

  return (
    <div className="rounded-3xl border border-white/[0.08] bg-gradient-to-b from-zinc-900/95 to-zinc-950/90 px-2 pt-3 pb-3 space-y-3">
      {/* Orbit: meals around personal calorie target */}
      <div className="relative mx-auto w-full max-w-[320px] aspect-square">
        {slots.map((s) => (
          <button
            key={s.type}
            type="button"
            onClick={() => onAddMeal?.(s.type)}
            className={cn(
              "absolute z-10 w-[88px] rounded-2xl border px-1.5 py-2 text-center",
              "active:scale-[0.97] transition-transform",
              MEAL_POS[s.type],
              s.open
                ? "border-white/[0.08] bg-zinc-950/90"
                : "border-accent/35 bg-accent/10"
            )}
          >
            <span className="text-base leading-none" aria-hidden>
              {MEAL_EMOJI[s.type] ?? "🍽"}
            </span>
            <p className="text-[10px] font-medium text-zinc-300 mt-0.5 truncate leading-tight">
              {MEAL_TYPE_LABELS[s.type]}
            </p>
            <p
              className={cn(
                "text-[11px] font-bold tabular-nums mt-0.5 leading-none",
                s.open ? "text-zinc-500" : "text-white"
              )}
            >
              {s.kcal.toLocaleString("de-DE")}
              <span className="text-[9px] font-medium text-zinc-500"> kcal</span>
            </p>
            <p className="text-[9px] text-zinc-600 mt-0.5">
              {s.open ? "offen" : `${s.items}×`}
            </p>
          </button>
        ))}

        <div className="absolute inset-[18%] flex items-center justify-center">
          <CalorieRing
            consumed={consumed.calories}
            target={targets.calories}
            remaining={remaining.calories}
            size={168}
            ringId="nutrition-kcal-ring"
            centerMode="target"
            label="TAGESZIEL"
          />
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2 px-1">
        {macros.map((m) => {
          const pct =
            m.target > 0 ? Math.min(100, Math.round((m.value / m.target) * 100)) : 0;
          return (
            <div
              key={m.key}
              className="rounded-2xl border border-white/[0.07] bg-white/[0.03] px-2 py-2.5 text-center"
            >
              <p className={`text-[10px] font-semibold uppercase tracking-wide ${m.tint}`}>
                {m.label}
              </p>
              <p className="text-base font-bold text-white tabular-nums mt-1 leading-none">
                {m.value}
                <span className="text-[10px] font-medium text-zinc-500">g</span>
              </p>
              <div className="mt-2 h-1 rounded-full bg-zinc-800 overflow-hidden">
                <div className={`h-full rounded-full ${m.bar}`} style={{ width: `${pct}%` }} />
              </div>
              <p className="text-[9px] text-zinc-500 tabular-nums mt-1.5">
                {m.left}g übrig
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
});
