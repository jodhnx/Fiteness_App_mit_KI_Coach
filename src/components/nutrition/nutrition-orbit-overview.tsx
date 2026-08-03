"use client";

import { memo } from "react";
import Link from "next/link";
import type { NutritionDashboardPayload } from "@/lib/nutrition-defaults";
import { hasNutritionTargets, nutritionProfileIncomplete } from "@/lib/nutrition-defaults";
import { CalorieRing } from "@/components/nutrition/calorie-ring";
import { NutritionMacroCard } from "@/components/nutrition/nutrition-macro-card";
import { PremiumCard } from "@/components/ui/premium-card";

type OrbitStat = {
  key: string;
  label: string;
  value: string;
  sub?: string;
  color: string;
};

/** Kalorien-Kreis mit umliegenden Makro-/Nährstoff-Stats. */
export const NutritionOrbitOverview = memo(function NutritionOrbitOverview({
  dashboard,
}: {
  dashboard: NutritionDashboardPayload;
}) {
  const { consumed, targets, remaining, water } = dashboard;
  const ready = hasNutritionTargets(dashboard);
  const incomplete = nutritionProfileIncomplete(dashboard);
  const fiberRemaining = Math.max(0, Math.round(targets.fiberG - consumed.fiberG));

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

  const orbit: OrbitStat[] = [
    {
      key: "p",
      label: "Protein",
      value: `${Math.round(consumed.proteinG)}g`,
      sub: `übrig ${Math.round(remaining.proteinG)}g`,
      color: "text-rose-400",
    },
    {
      key: "c",
      label: "KH",
      value: `${Math.round(consumed.carbsG)}g`,
      sub: `übrig ${Math.round(remaining.carbsG)}g`,
      color: "text-amber-400",
    },
    {
      key: "f",
      label: "Fett",
      value: `${Math.round(consumed.fatG)}g`,
      sub: `übrig ${Math.round(remaining.fatG)}g`,
      color: "text-sky-400",
    },
    {
      key: "fi",
      label: "Ballast",
      value: `${Math.round(consumed.fiberG)}g`,
      sub: `Ziel ${Math.round(targets.fiberG)}g`,
      color: "text-emerald-400",
    },
    {
      key: "w",
      label: "Wasser",
      value: `${Math.round(water.consumedMl)}ml`,
      sub: `Ziel ${Math.round(water.targetMl)}ml`,
      color: "text-cyan-400",
    },
    {
      key: "left",
      label: "Übrig",
      value: `${Math.round(remaining.calories)}`,
      sub: "kcal",
      color: "text-accent",
    },
  ];

  return (
    <div className="space-y-3">
      <PremiumCard glow className="overflow-hidden">
        <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-[0.15em] mb-2">
          Kalorienübersicht
        </p>
        <div className="flex flex-col items-center gap-4">
          <CalorieRing
            consumed={consumed.calories}
            target={targets.calories}
            remaining={remaining.calories}
            size={148}
            ringId="nutrition-kcal-ring"
            label="ÜBRIG"
          />
          <div className="grid grid-cols-3 gap-2 w-full">
            {orbit.map((o) => (
              <div
                key={o.key}
                className="rounded-xl bg-white/[0.03] border border-white/[0.06] px-1.5 py-2 text-center"
              >
                <p className={`text-[9px] uppercase tracking-wide ${o.color}`}>{o.label}</p>
                <p className="text-xs font-bold text-white tabular-nums mt-0.5">{o.value}</p>
                {o.sub && (
                  <p className="text-[9px] text-zinc-600 mt-0.5 truncate">{o.sub}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      </PremiumCard>

      <div>
        <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-[0.15em] mb-2 px-0.5">
          Makros Detail
        </p>
        <div className="grid grid-cols-2 gap-2">
          <NutritionMacroCard
            compact
            emoji="🥩"
            label="Protein"
            consumed={consumed.proteinG}
            target={targets.proteinG}
            remaining={remaining.proteinG}
            barColor="bg-rose-400"
          />
          <NutritionMacroCard
            compact
            emoji="🍚"
            label="Kohlenhydrate"
            consumed={consumed.carbsG}
            target={targets.carbsG}
            remaining={remaining.carbsG}
            barColor="bg-amber-400"
          />
          <NutritionMacroCard
            compact
            emoji="🥑"
            label="Fett"
            consumed={consumed.fatG}
            target={targets.fatG}
            remaining={remaining.fatG}
            barColor="bg-sky-400"
          />
          <NutritionMacroCard
            compact
            emoji="🌾"
            label="Ballaststoffe"
            consumed={consumed.fiberG}
            target={targets.fiberG}
            remaining={fiberRemaining}
            barColor="bg-emerald-400"
          />
        </div>
      </div>
    </div>
  );
});
