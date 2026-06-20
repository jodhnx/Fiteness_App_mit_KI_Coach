"use client";

import { memo } from "react";
import { MacroProgressBar } from "@/components/home/macro-progress-bar";
import { cn } from "@/lib/utils";

type Macro = { consumed: number; target: number; remaining: number };

type Props = {
  calories: Macro;
  protein: Macro;
  carbs: Macro;
  fat: Macro;
  fiber?: { consumed: number; target: number };
};

function MacroRow({
  label,
  consumed,
  target,
  remaining,
  unit,
}: {
  label: string;
  consumed: number;
  target: number;
  remaining: number;
  unit: string;
}) {
  return (
    <div className="py-3.5 border-b border-zinc-800/80 last:border-0">
      <div className="flex items-baseline justify-between gap-3 mb-2">
        <span className="text-sm text-zinc-400">{label}</span>
        <span className="text-sm text-zinc-500 tabular-nums shrink-0">
          {Math.max(0, Math.round(remaining))}
          {unit} übrig
        </span>
      </div>
      <p className="text-base font-semibold text-white tabular-nums mb-2">
        {Math.round(consumed)}
        <span className="text-zinc-600 font-normal"> / </span>
        {Math.round(target)}
        {unit}
      </p>
      <MacroProgressBar consumed={consumed} target={target} variant="neutral" className="h-1" />
    </div>
  );
}

export const RemainingMacrosHero = memo(function RemainingMacrosHero({
  calories,
  protein,
  carbs,
  fat,
  fiber,
}: Props) {
  const kcalLeft = Math.max(0, Math.round(calories.remaining));

  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-900/80 overflow-hidden">
      <div className="px-5 pt-6 pb-5 text-center border-b border-zinc-800/80">
        <p className="text-5xl font-semibold text-white tabular-nums leading-none tracking-tight">
          {kcalLeft.toLocaleString("de-DE")}
        </p>
        <p className="text-sm text-zinc-400 mt-2">kcal übrig</p>
        <p className="text-sm text-zinc-500 mt-2 tabular-nums">
          {Math.round(calories.consumed).toLocaleString("de-DE")} /{" "}
          {Math.round(calories.target).toLocaleString("de-DE")} kcal
        </p>
        <MacroProgressBar
          consumed={calories.consumed}
          target={calories.target}
          variant="neutral"
          className="mt-4 max-w-xs mx-auto"
        />
      </div>

      <div className="px-5 py-1">
        <MacroRow
          label="Protein"
          consumed={protein.consumed}
          target={protein.target}
          remaining={protein.remaining}
          unit="g"
        />
        <MacroRow
          label="Kohlenhydrate"
          consumed={carbs.consumed}
          target={carbs.target}
          remaining={carbs.remaining}
          unit="g"
        />
        <MacroRow
          label="Fett"
          consumed={fat.consumed}
          target={fat.target}
          remaining={fat.remaining}
          unit="g"
        />
        {fiber && (
          <div className={cn("py-3.5")}>
            <div className="flex items-baseline justify-between gap-3 mb-2">
              <span className="text-sm text-zinc-400">Ballaststoffe</span>
            </div>
            <p className="text-base font-semibold text-white tabular-nums mb-2">
              {Math.round(fiber.consumed)}
              <span className="text-zinc-600 font-normal"> / </span>
              {Math.round(fiber.target)}g
            </p>
            <MacroProgressBar consumed={fiber.consumed} target={fiber.target} variant="neutral" className="h-1" />
          </div>
        )}
      </div>
    </div>
  );
});

export { RemainingMacrosHero as ConsumedMacrosHero };
