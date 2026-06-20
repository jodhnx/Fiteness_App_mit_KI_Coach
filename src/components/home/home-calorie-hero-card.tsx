"use client";

import { memo } from "react";
import Link from "next/link";
import type { NutritionDashboardPayload } from "@/lib/nutrition-defaults";
import { hasNutritionTargets, nutritionProfileIncomplete } from "@/lib/nutrition-defaults";
import { cn } from "@/lib/utils";
import { CalorieRing } from "@/components/nutrition/calorie-ring";

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
        className="block rounded-[1.75rem] border border-amber-500/25 bg-gradient-to-br from-zinc-900 to-zinc-950 p-6 text-center"
      >
        <p className="text-sm text-amber-200">
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

  return (
    <Link
      href="/nutrition"
      prefetch
      className={cn(
        "block rounded-[1.75rem] border border-cyan-500/25",
        "bg-gradient-to-br from-zinc-900 via-zinc-900/95 to-zinc-950",
        "p-5 shadow-2xl shadow-black/40 active:scale-[0.995] transition-transform"
      )}
    >
      <CalorieRing
        consumed={consumed.calories}
        target={targets.calories}
        remaining={remaining.calories}
        size={176}
      />
      <div className="mt-3 grid grid-cols-3 gap-2 text-center">
        <StatPill label="Ziel" value={`${Math.round(targets.calories)}`} unit="kcal" />
        <StatPill label="Verzehrt" value={`${Math.round(consumed.calories)}`} unit="kcal" highlight />
        <StatPill label="Übrig" value={`${Math.max(0, Math.round(remaining.calories))}`} unit="kcal" />
      </div>
    </Link>
  );
});

function StatPill({
  label,
  value,
  unit,
  highlight,
}: {
  label: string;
  value: string;
  unit: string;
  highlight?: boolean;
}) {
  return (
    <div
      className={cn(
        "rounded-xl px-2 py-2.5 border",
        highlight
          ? "border-cyan-500/30 bg-cyan-500/10"
          : "border-zinc-800/80 bg-zinc-950/50"
      )}
    >
      <p className="text-[10px] text-zinc-500 uppercase tracking-wide">{label}</p>
      <p className={cn("text-lg font-bold tabular-nums mt-0.5", highlight ? "text-cyan-300" : "text-white")}>
        {value}
      </p>
      <p className="text-[10px] text-zinc-600">{unit}</p>
    </div>
  );
}
