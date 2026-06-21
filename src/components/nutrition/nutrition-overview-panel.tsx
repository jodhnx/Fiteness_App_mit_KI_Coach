"use client";

import { memo } from "react";
import Link from "next/link";
import type { NutritionDashboardPayload } from "@/lib/nutrition-defaults";
import { hasNutritionTargets, nutritionProfileIncomplete } from "@/lib/nutrition-defaults";
import { CalorieRing } from "@/components/nutrition/calorie-ring";
import { NutritionMacroCard } from "@/components/nutrition/nutrition-macro-card";

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
    <div className="rounded-2xl bg-zinc-900/80 border border-zinc-800 overflow-hidden">
      <div className="flex justify-center py-5 px-3">
        <CalorieRing
          consumed={consumed.calories}
          target={targets.calories}
          remaining={remaining.calories}
          size={152}
          ringId="nutrition-kcal-ring"
          label="ÜBRIG"
        />
      </div>

      <div className="grid grid-cols-2 gap-px bg-zinc-800/60 border-t border-zinc-800/80">
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
  );
});
