"use client";

import { memo } from "react";
import Link from "next/link";
import type { NutritionDashboardPayload } from "@/lib/nutrition-defaults";
import { hasNutritionTargets, nutritionProfileIncomplete } from "@/lib/nutrition-defaults";
import { CalorieRing } from "@/components/nutrition/calorie-ring";

/** Clean calorie hero + compact P / KH / F row (Yazio / MFP style). */
export const NutritionOrbitOverview = memo(function NutritionOrbitOverview({
  dashboard,
}: {
  dashboard: NutritionDashboardPayload;
}) {
  const { consumed, targets, remaining } = dashboard;
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

  return (
    <div className="rounded-3xl border border-white/[0.08] bg-gradient-to-b from-zinc-900/95 to-zinc-950/90 px-3 pt-4 pb-3 space-y-3">
      <CalorieRing
        consumed={consumed.calories}
        target={targets.calories}
        remaining={remaining.calories}
        size={176}
        ringId="nutrition-kcal-ring"
        label="ÜBRIG"
      />

      <div className="grid grid-cols-3 gap-2">
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
