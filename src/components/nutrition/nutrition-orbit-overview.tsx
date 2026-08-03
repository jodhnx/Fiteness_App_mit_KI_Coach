"use client";

import { memo } from "react";
import Link from "next/link";
import type { NutritionDashboardPayload } from "@/lib/nutrition-defaults";
import { hasNutritionTargets, nutritionProfileIncomplete } from "@/lib/nutrition-defaults";
import { CalorieRing } from "@/components/nutrition/calorie-ring";

type OrbitCorner = {
  key: string;
  label: string;
  value: string;
  sub: string;
  accent: string;
  position: string;
};

/** Compact calorie hero with macros orbiting the ring (Yazio / MFP style). */
export const NutritionOrbitOverview = memo(function NutritionOrbitOverview({
  dashboard,
}: {
  dashboard: NutritionDashboardPayload;
}) {
  const { consumed, targets, remaining, water } = dashboard;
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

  const corners: OrbitCorner[] = [
    {
      key: "p",
      label: "Protein",
      value: `${Math.round(consumed.proteinG)}g`,
      sub: `${Math.round(remaining.proteinG)}g übrig`,
      accent: "text-rose-400",
      position: "left-0 top-0 items-start text-left",
    },
    {
      key: "f",
      label: "Fett",
      value: `${Math.round(consumed.fatG)}g`,
      sub: `${Math.round(remaining.fatG)}g übrig`,
      accent: "text-sky-400",
      position: "right-0 top-0 items-end text-right",
    },
    {
      key: "c",
      label: "Kohlenhydrate",
      value: `${Math.round(consumed.carbsG)}g`,
      sub: `${Math.round(remaining.carbsG)}g übrig`,
      accent: "text-amber-400",
      position: "left-0 bottom-0 items-start text-left",
    },
    {
      key: "w",
      label: "Wasser",
      value: `${(Math.round(water.consumedMl / 100) / 10).toFixed(1)}l`,
      sub: `Ziel ${(Math.round(water.targetMl / 100) / 10).toFixed(1)}l`,
      accent: "text-cyan-400",
      position: "right-0 bottom-0 items-end text-right",
    },
  ];

  return (
    <div className="rounded-3xl border border-white/[0.08] bg-gradient-to-b from-zinc-900/90 to-zinc-950/90 px-3 pt-3 pb-2">
      <div className="relative mx-auto h-[220px] w-full max-w-[340px]">
        {corners.map((c) => (
          <div
            key={c.key}
            className={`absolute flex flex-col gap-0.5 max-w-[88px] ${c.position}`}
          >
            <p className={`text-[10px] font-semibold uppercase tracking-wide ${c.accent}`}>
              {c.label}
            </p>
            <p className="text-sm font-bold text-white tabular-nums leading-none">{c.value}</p>
            <p className="text-[9px] text-zinc-500 tabular-nums leading-tight">{c.sub}</p>
          </div>
        ))}

        <div className="absolute inset-0 flex items-center justify-center">
          <CalorieRing
            consumed={consumed.calories}
            target={targets.calories}
            remaining={remaining.calories}
            size={168}
            ringId="nutrition-kcal-ring"
            label="ÜBRIG"
          />
        </div>
      </div>
    </div>
  );
});
