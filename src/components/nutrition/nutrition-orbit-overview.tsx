"use client";

import { memo } from "react";
import Link from "next/link";
import type { MealType } from "@prisma/client";
import type { NutritionDashboardPayload } from "@/lib/nutrition-defaults";
import { hasNutritionTargets, nutritionProfileIncomplete } from "@/lib/nutrition-defaults";
import { CalorieRing } from "@/components/nutrition/calorie-ring";
import { TRACK_MEAL_ORDER, MEAL_TYPE_LABELS } from "@/lib/meal-types";
import { cn } from "@/lib/utils";
import { Plus } from "lucide-react";

const MEAL_EMOJI: Record<string, string> = {
  BREAKFAST: "🍳",
  LUNCH: "🍗",
  DINNER: "🥗",
  SNACK: "🍎",
};

type Props = {
  dashboard: NutritionDashboardPayload;
  onAddMeal?: (meal: MealType) => void;
};

/**
 * Compact calorie hero: ring + 4 slim meal chips (not a large orbit square).
 * Empty → „Hinzufügen“; filled → kcal. Over-target uses red ring messaging.
 */
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

  const kcalTarget = Math.round(targets.calories);
  const kcalConsumed = Math.round(consumed.calories);
  const overBy = Math.max(0, kcalConsumed - kcalTarget);
  const isOver = overBy > 0;

  const slots = TRACK_MEAL_ORDER.map((type) => {
    const found = mealsByType.find((m) => m.mealType === type);
    const items = found?.items.length ?? 0;
    const kcal = Math.round(found?.totals.calories ?? 0);
    return { type, items, kcal, open: items === 0 };
  });

  const macros = [
    {
      key: "p",
      label: "Protein",
      value: Math.round(consumed.proteinG),
      target: Math.round(targets.proteinG),
      bar: "bg-rose-400",
      tint: "text-rose-400",
    },
    {
      key: "c",
      label: "KH",
      value: Math.round(consumed.carbsG),
      target: Math.round(targets.carbsG),
      bar: "bg-amber-400",
      tint: "text-amber-400",
    },
    {
      key: "f",
      label: "Fett",
      value: Math.round(consumed.fatG),
      target: Math.round(targets.fatG),
      bar: "bg-sky-400",
      tint: "text-sky-400",
    },
  ] as const;

  return (
    <div className="rounded-3xl border border-white/[0.08] bg-gradient-to-b from-zinc-900/95 to-zinc-950/90 px-3 pt-3 pb-3 space-y-3">
      <div className="flex items-center justify-between gap-2 px-0.5">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-zinc-500">
            Tagesziel
          </p>
          <p className="text-sm font-bold text-white tabular-nums">
            {kcalTarget.toLocaleString("de-DE")}{" "}
            <span className="text-zinc-500 font-medium">kcal</span>
          </p>
        </div>
        <div className="text-right">
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-zinc-500">
            {isOver ? "Über Ziel" : "Übrig"}
          </p>
          <p
            className={cn(
              "text-sm font-bold tabular-nums",
              isOver ? "text-red-400" : "text-accent"
            )}
          >
            {isOver
              ? `+${overBy.toLocaleString("de-DE")}`
              : Math.max(0, Math.round(remaining.calories)).toLocaleString("de-DE")}{" "}
            <span className="text-zinc-500 font-medium">kcal</span>
          </p>
        </div>
      </div>

      <CalorieRing
        consumed={consumed.calories}
        target={targets.calories}
        remaining={remaining.calories}
        size={148}
        ringId="nutrition-kcal-ring"
        centerMode="remaining"
        label="ÜBRIG"
      />

      {/* Compact 2×2 meal chips — low height, tap to add */}
      <div className="grid grid-cols-2 gap-1.5">
        {slots.map((s) => (
          <button
            key={s.type}
            type="button"
            onClick={() => onAddMeal?.(s.type)}
            className={cn(
              "flex items-center gap-2 rounded-2xl border px-2.5 py-2 text-left",
              "active:scale-[0.98] transition-transform min-h-[44px]",
              s.open
                ? "border-white/[0.07] bg-white/[0.02]"
                : "border-accent/25 bg-accent/[0.08]"
            )}
          >
            <span className="text-lg leading-none shrink-0" aria-hidden>
              {MEAL_EMOJI[s.type]}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-[11px] font-semibold text-zinc-200 truncate">
                {MEAL_TYPE_LABELS[s.type]}
              </span>
              {s.open ? (
                <span className="inline-flex items-center gap-0.5 text-[10px] text-accent mt-0.5">
                  <Plus className="h-3 w-3" />
                  Hinzufügen
                </span>
              ) : (
                <span className="block text-[11px] font-bold text-white tabular-nums mt-0.5">
                  {s.kcal.toLocaleString("de-DE")} kcal
                  <span className="text-zinc-500 font-medium"> · {s.items}</span>
                </span>
              )}
            </span>
          </button>
        ))}
      </div>

      <div className="grid grid-cols-3 gap-1.5">
        {macros.map((m) => {
          const pct =
            m.target > 0 ? Math.min(100, Math.round((m.value / m.target) * 100)) : 0;
          return (
            <div
              key={m.key}
              className="rounded-xl border border-white/[0.06] bg-white/[0.02] px-2 py-2 text-center"
            >
              <p className={`text-[9px] font-semibold uppercase tracking-wide ${m.tint}`}>
                {m.label}
              </p>
              <p className="text-sm font-bold text-white tabular-nums mt-0.5 leading-none">
                {m.value}
                <span className="text-[9px] text-zinc-500">/{m.target}g</span>
              </p>
              <div className="mt-1.5 h-0.5 rounded-full bg-zinc-800 overflow-hidden">
                <div className={`h-full rounded-full ${m.bar}`} style={{ width: `${pct}%` }} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
});
