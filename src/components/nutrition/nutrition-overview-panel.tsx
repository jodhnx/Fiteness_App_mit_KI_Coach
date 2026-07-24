"use client";

import { memo } from "react";
import Link from "next/link";
import type { NutritionDashboardPayload } from "@/lib/nutrition-defaults";
import { hasNutritionTargets, nutritionProfileIncomplete } from "@/lib/nutrition-defaults";
import { CalorieRing } from "@/components/nutrition/calorie-ring";
import { NutritionMacroCard } from "@/components/nutrition/nutrition-macro-card";
import { PremiumCard } from "@/components/ui/premium-card";

export const NutritionOverviewPanel = memo(function NutritionOverviewPanel({
  dashboard,
}: {
  dashboard: NutritionDashboardPayload;
}) {
  const { consumed, targets, remaining } = dashboard;
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

  return (
    <div className="space-y-3">
      {/* 1. Kalorienübersicht */}
      <PremiumCard glow className="overflow-hidden">
        <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-[0.15em] mb-1">
          Kalorienübersicht
        </p>
        <div className="flex justify-center py-2">
          <CalorieRing
            consumed={consumed.calories}
            target={targets.calories}
            remaining={remaining.calories}
            size={152}
            ringId="nutrition-kcal-ring"
            label="ÜBRIG"
          />
        </div>
      </PremiumCard>

      {/* 2. Makros */}
      <div>
        <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-[0.15em] mb-2 px-0.5">
          Makros
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
