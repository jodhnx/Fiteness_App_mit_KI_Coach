"use client";

import { memo } from "react";
import Link from "next/link";
import type { MealType } from "@prisma/client";
import type { NutritionDashboardPayload } from "@/lib/nutrition-defaults";
import { hasNutritionTargets, nutritionProfileIncomplete } from "@/lib/nutrition-defaults";
import { getCalorieDisplay, getMacroDisplay } from "@/lib/nutrition-display";
import { CalorieRing } from "@/components/nutrition/calorie-ring";
import { cn } from "@/lib/utils";

type Props = {
  dashboard: NutritionDashboardPayload | null | undefined;
  onAddMeal?: (meal: MealType) => void;
};

/** YAZIO-inspired today summary — remaining kcal primary. */
export const NutritionOrbitOverview = memo(function NutritionOrbitOverview({
  dashboard,
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

  const cal = getCalorieDisplay(
    consumed.calories ?? 0,
    targets.calories ?? 0,
    remaining.calories
  );

  const macros = [
    { key: "p", label: "Protein", consumed: consumed.proteinG ?? 0, target: targets.proteinG ?? 0, bar: "bg-rose-400", tint: "text-rose-400" },
    { key: "c", label: "KH", consumed: consumed.carbsG ?? 0, target: targets.carbsG ?? 0, bar: "bg-amber-400", tint: "text-amber-400" },
    { key: "f", label: "Fett", consumed: consumed.fatG ?? 0, target: targets.fatG ?? 0, bar: "bg-sky-400", tint: "text-sky-400" },
  ] as const;

  return (
    <div
      className={cn(
        "rounded-[1.75rem] border px-3.5 pt-5 pb-3.5 space-y-4",
        "bg-gradient-to-b from-zinc-900/95 via-zinc-950/90 to-zinc-950",
        cal.isOver
          ? "border-red-500/35 shadow-[0_0_40px_-18px_rgba(239,68,68,0.45)]"
          : "border-white/[0.08]"
      )}
    >
      <div className="text-center space-y-1">
        <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-zinc-500">
          Heute
        </p>
        <p
          className={cn(
            "text-[2.75rem] font-bold leading-none tabular-nums tracking-tight",
            cal.isOver ? "text-red-400" : "text-white"
          )}
        >
          {cal.primaryValue.toLocaleString("de-DE")}
        </p>
        <p
          className={cn(
            "text-sm font-semibold",
            cal.isOver ? "text-red-400/90" : "text-zinc-300"
          )}
        >
          {cal.primaryLabel}
        </p>
        <p className="text-xs text-zinc-500 tabular-nums">{cal.secondaryLine}</p>
      </div>

      <CalorieRing
        consumed={consumed.calories}
        target={targets.calories}
        remaining={remaining.calories}
        size={188}
        ringId="nutrition-kcal-ring"
        centerMode="remaining"
        label={cal.isOver ? "ÜBER ZIEL" : "ÜBRIG"}
      />

      {burned > 0 && (
        <p className="text-center text-xs text-orange-300/90 font-medium tabular-nums -mt-1">
          🔥 {Math.round(burned)} kcal verbrannt
          {burnedEstimated ? " (geschätzt)" : ""}
        </p>
      )}

      <div className="grid grid-cols-3 gap-2">
        {macros.map((m) => {
          const macro = getMacroDisplay(m.consumed, m.target, m.label);
          const pct =
            m.target > 0 ? Math.min(100, Math.round((m.consumed / m.target) * 100)) : 0;
          return (
            <div
              key={m.key}
              className="rounded-2xl border border-white/[0.06] bg-white/[0.025] px-2.5 py-2.5 text-center"
            >
              <p className={`text-[10px] font-semibold uppercase tracking-wide ${m.tint}`}>
                {m.label}
              </p>
              <p className="mt-1 text-[13px] font-bold text-white tabular-nums leading-snug">
                {macro.primaryLine.replace(` ${m.label}`, "")}
              </p>
              <p className="text-[10px] font-medium text-zinc-500 tabular-nums mt-0.5">
                {macro.secondaryLine}
              </p>
              <div className="mt-2 h-1 rounded-full bg-zinc-800 overflow-hidden">
                <div className={`h-full rounded-full ${m.bar}`} style={{ width: `${pct}%` }} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
});
