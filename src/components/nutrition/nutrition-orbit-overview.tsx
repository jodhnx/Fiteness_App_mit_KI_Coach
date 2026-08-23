"use client";

import { memo } from "react";
import Link from "next/link";
import type { MealType } from "@prisma/client";
import type { NutritionDashboardPayload } from "@/lib/nutrition-defaults";
import { hasNutritionTargets, nutritionProfileIncomplete } from "@/lib/nutrition-defaults";
import { CalorieRing } from "@/components/nutrition/calorie-ring";
import { cn } from "@/lib/utils";

type Props = {
  dashboard: NutritionDashboardPayload | null | undefined;
  onAddMeal?: (meal: MealType) => void; // kept for API compat
};

/**
 * Premium nutrition hero: large calorie ring + macros + compact meal chips.
 */
export const NutritionOrbitOverview = memo(function NutritionOrbitOverview({
  dashboard,
  onAddMeal: _onAddMeal,
}: Props) {
  if (!dashboard) {
    return (
      <div className="rounded-[1.75rem] border border-white/[0.08] bg-gradient-to-b from-zinc-900/90 to-zinc-950/95 px-6 py-10 text-center animate-pulse">
        <div className="h-24 w-24 rounded-full bg-white/5 mx-auto mb-4" />
        <div className="h-4 w-32 bg-white/5 mx-auto rounded" />
      </div>
    );
  }

  const consumed = dashboard.consumed ?? {
    calories: 0,
    proteinG: 0,
    carbsG: 0,
    fatG: 0,
  };
  const targets = dashboard.targets ?? {
    calories: 0,
    proteinG: 0,
    carbsG: 0,
    fatG: 0,
  };
  const remaining = dashboard.remaining ?? {
    calories: 0,
    proteinG: 0,
    carbsG: 0,
    fatG: 0,
  };
  const burned = dashboard.exerciseBurned?.calories ?? 0;
  const burnedEstimated = dashboard.exerciseBurned?.estimated ?? true;
  const ready = hasNutritionTargets(dashboard);
  const incomplete = nutritionProfileIncomplete(dashboard);

  if (!ready) {
    return (
      <Link
        href="/settings"
        prefetch
        className="block rounded-[1.75rem] border border-white/[0.08] bg-zinc-900/80 px-6 py-10 text-center"
      >
        <p className="text-sm text-zinc-300">
          {incomplete
            ? "Bitte Gewicht und Ziel vervollständigen"
            : "Kalorienziel wird berechnet…"}
        </p>
      </Link>
    );
  }

  const kcalTarget = Math.round(targets.calories ?? 0);
  const kcalConsumed = Math.round(consumed.calories ?? 0);
  const overBy = Math.max(0, kcalConsumed - kcalTarget);
  const isOver = overBy > 0;
  const left = Math.max(0, Math.round(remaining.calories ?? 0));

  const macros = [
    {
      key: "p",
      label: "Protein",
      value: Math.round(consumed.proteinG ?? 0),
      target: Math.round(targets.proteinG ?? 0),
      bar: "bg-rose-400",
      tint: "text-rose-400",
    },
    {
      key: "c",
      label: "Carbs",
      value: Math.round(consumed.carbsG ?? 0),
      target: Math.round(targets.carbsG ?? 0),
      bar: "bg-amber-400",
      tint: "text-amber-400",
    },
    {
      key: "f",
      label: "Fett",
      value: Math.round(consumed.fatG ?? 0),
      target: Math.round(targets.fatG ?? 0),
      bar: "bg-sky-400",
      tint: "text-sky-400",
    },
  ] as const;

  return (
    <div
      className={cn(
        "rounded-[1.75rem] border px-3.5 pt-4 pb-3.5 space-y-4",
        "bg-gradient-to-b from-zinc-900/95 via-zinc-950/90 to-zinc-950",
        isOver
          ? "border-red-500/35 shadow-[0_0_40px_-18px_rgba(239,68,68,0.45)]"
          : "border-white/[0.08]"
      )}
    >
      <div className="text-center space-y-0.5">
        <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-zinc-500">
          Heute
        </p>
        <p className="text-[15px] font-semibold text-white tabular-nums">
          {kcalConsumed.toLocaleString("de-DE")}
          <span className="text-zinc-500 font-medium">
            {" "}
            / {kcalTarget.toLocaleString("de-DE")} kcal
          </span>
        </p>
      </div>

      <CalorieRing
        consumed={consumed.calories}
        target={targets.calories}
        remaining={remaining.calories}
        size={188}
        ringId="nutrition-kcal-ring"
        centerMode="remaining"
        label={isOver ? "ÜBER ZIEL" : "ÜBRIG"}
      />

      <p
        className={cn(
          "text-center text-sm font-semibold tabular-nums -mt-1",
          isOver ? "text-red-400" : "text-zinc-300"
        )}
      >
        {isOver
          ? `${overBy.toLocaleString("de-DE")} kcal über Ziel`
          : `${left.toLocaleString("de-DE")} kcal verfügbar`}
      </p>
      {burned >= 0 && (
        <p className="text-center text-xs text-orange-300/90 font-medium tabular-nums">
          🔥 {Math.round(burned)} kcal verbrannt
          {burned > 0 && burnedEstimated ? " (geschätzt)" : ""}
          {burned > 0 ? " · im Budget eingerechnet" : ""}
        </p>
      )}

      <div className="grid grid-cols-3 gap-2">
        {macros.map((m) => {
          const pct =
            m.target > 0 ? Math.min(100, Math.round((m.value / m.target) * 100)) : 0;
          return (
            <div
              key={m.key}
              className="rounded-2xl border border-white/[0.06] bg-white/[0.025] px-2.5 py-2.5 text-center"
            >
              <p className={`text-[10px] font-semibold uppercase tracking-wide ${m.tint}`}>
                {m.label}
              </p>
              <p className="mt-1 text-[13px] font-bold text-white tabular-nums leading-none">
                {m.value}
                <span className="text-[10px] font-medium text-zinc-500">
                  {" "}
                  / {m.target} g
                </span>
              </p>
              <div className="mt-2 h-1 rounded-full bg-zinc-800 overflow-hidden">
                <div
                  className={`h-full rounded-full ${m.bar}`}
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>

    </div>
  );
});
