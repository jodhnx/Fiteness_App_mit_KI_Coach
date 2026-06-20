"use client";

import { memo } from "react";
import Link from "next/link";
import type { NutritionDashboardPayload } from "@/lib/nutrition-defaults";
import { hasNutritionTargets, nutritionProfileIncomplete } from "@/lib/nutrition-defaults";
import { MacroProgressBar } from "@/components/home/macro-progress-bar";

export const HomeCalorieHeroCard = memo(function HomeCalorieHeroCard({
  nutrition,
}: {
  nutrition: NutritionDashboardPayload;
}) {
  const { consumed, targets, remaining } = nutrition;
  const ready = hasNutritionTargets(nutrition);
  const incomplete = nutritionProfileIncomplete(nutrition);

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
        {incomplete && (
          <p className="text-xs text-zinc-500 mt-2">Einstellungen öffnen →</p>
        )}
      </Link>
    );
  }

  const kcalLeft = Math.max(0, Math.round(remaining.calories));
  const kcalConsumed = Math.round(consumed.calories);
  const kcalTarget = Math.round(targets.calories);

  return (
    <Link
      href="/nutrition"
      prefetch
      className="block rounded-2xl border border-zinc-800 bg-zinc-900/80 px-6 py-8 text-center active:opacity-95 transition-opacity"
    >
      <p className="text-6xl font-semibold text-white tabular-nums leading-none tracking-tight">
        {kcalLeft.toLocaleString("de-DE")}
      </p>
      <p className="text-sm text-zinc-400 mt-2 font-medium">kcal übrig</p>
      <p className="text-sm text-zinc-500 mt-3 tabular-nums">
        {kcalConsumed.toLocaleString("de-DE")} / {kcalTarget.toLocaleString("de-DE")} kcal
      </p>
      <MacroProgressBar
        consumed={consumed.calories}
        target={targets.calories}
        variant="neutral"
        className="mt-5 max-w-sm mx-auto"
      />
    </Link>
  );
});
