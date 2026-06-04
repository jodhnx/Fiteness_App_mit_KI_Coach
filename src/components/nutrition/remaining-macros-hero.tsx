"use client";

import { memo } from "react";
import { MacroProgressBar } from "@/components/home/macro-progress-bar";

type Macro = { consumed: number; target: number; remaining: number };

type Props = {
  calories: Macro;
  protein: Macro;
  carbs: Macro;
  fat: Macro;
  fiber?: { consumed: number; target: number };
};

function MacroMiniCard({
  emoji,
  label,
  consumed,
  target,
  unit,
}: {
  emoji: string;
  label: string;
  consumed: number;
  target: number;
  unit: string;
}) {
  return (
    <div className="rounded-xl bg-zinc-800/60 border border-zinc-700/80 p-3 flex flex-col gap-1.5 min-w-0">
      <p className="text-[11px] text-zinc-400 truncate">
        <span className="mr-1">{emoji}</span>
        {label}
      </p>
      <p className="text-lg font-bold text-white tabular-nums leading-none">
        {Math.round(consumed)}
        <span className="text-zinc-500 font-semibold text-sm"> / </span>
        {Math.round(target)}
        <span className="text-xs text-zinc-500 font-medium">{unit}</span>
      </p>
      <MacroProgressBar consumed={consumed} target={target} className="h-1" />
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
  const calRemaining = Math.max(0, Math.round(calories.remaining));
  const showRemainingPrimary = calRemaining > 0 && calories.consumed < calories.target;

  return (
    <div className="rounded-2xl border border-zinc-800 bg-gradient-to-br from-zinc-900 to-zinc-950 p-4 sm:p-5 space-y-4">
      <div className="text-center pb-1">
        <p className="text-xs uppercase tracking-widest text-zinc-500 flex items-center justify-center gap-1">
          <span>🔥</span> Kalorien
        </p>
        {showRemainingPrimary ? (
          <>
            <p className="text-4xl sm:text-5xl font-bold text-white tabular-nums mt-2 leading-none">
              {calRemaining}
            </p>
            <p className="text-sm text-zinc-400 mt-1">kcal übrig</p>
            <p className="text-xs text-zinc-600 mt-1 tabular-nums">
              {Math.round(calories.consumed)} / {calories.target} kcal
            </p>
          </>
        ) : (
          <>
            <p className="text-4xl sm:text-5xl font-bold text-white tabular-nums mt-2 leading-none">
              {Math.round(calories.consumed)}
              <span className="text-2xl text-zinc-500 font-semibold"> / </span>
              {calories.target}
            </p>
            <p className="text-sm text-zinc-400 mt-1">kcal</p>
          </>
        )}
        <MacroProgressBar
          consumed={calories.consumed}
          target={calories.target}
          className="mt-3 max-w-xs mx-auto h-1.5"
        />
      </div>

      <div
        className={`grid gap-2 pt-2 border-t border-zinc-800/80 ${
          fiber ? "grid-cols-2 sm:grid-cols-4" : "grid-cols-3"
        }`}
      >
        <MacroMiniCard
          emoji="🥩"
          label="Protein"
          consumed={protein.consumed}
          target={protein.target}
          unit="g"
        />
        <MacroMiniCard
          emoji="🍚"
          label="Kohlenhydrate"
          consumed={carbs.consumed}
          target={carbs.target}
          unit="g"
        />
        <MacroMiniCard
          emoji="🥑"
          label="Fett"
          consumed={fat.consumed}
          target={fat.target}
          unit="g"
        />
        {fiber && (
          <MacroMiniCard
            emoji="🌾"
            label="Ballaststoffe"
            consumed={fiber.consumed}
            target={fiber.target}
            unit="g"
          />
        )}
      </div>
    </div>
  );
});

export { RemainingMacrosHero as ConsumedMacrosHero };
