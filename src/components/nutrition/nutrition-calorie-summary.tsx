"use client";

import { memo } from "react";
import { CalorieRing } from "@/components/nutrition/calorie-ring";
import { MacroProgressBar } from "@/components/home/macro-progress-bar";
import { cn } from "@/lib/utils";

type Props = {
  consumed: number;
  target: number;
  remaining: number;
  showRing?: boolean;
  showProgress?: boolean;
  className?: string;
};

/** Stacked kcal layout — no overlapping text inside the ring. */
export const NutritionCalorieSummary = memo(function NutritionCalorieSummary({
  consumed,
  target,
  remaining,
  showRing = true,
  showProgress = true,
  className,
}: Props) {
  const hasTarget = target > 0;
  const kcalLeft = hasTarget ? Math.max(0, Math.round(remaining)) : 0;
  const kcalConsumed = Math.round(consumed);
  const kcalTarget = Math.round(target);

  return (
    <div className={cn("flex flex-col items-center w-full px-3 py-4", className)}>
      {showRing && hasTarget && (
        <div className="mb-3 shrink-0 pointer-events-none" aria-hidden>
          <CalorieRing
            consumed={consumed}
            target={target}
            remaining={remaining}
            size={112}
            ringId="nutrition-kcal-ring-deco"
            variant="ringOnly"
          />
        </div>
      )}

      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-500">
        Kalorien übrig
      </p>

      <p
        className={cn(
          "font-bold text-white tabular-nums leading-none mt-1.5 text-center",
          "text-[clamp(2rem,9vw,3rem)]"
        )}
      >
        {hasTarget ? (
          <>
            {kcalLeft.toLocaleString("de-DE")}
            <span className="text-[0.42em] font-semibold text-zinc-400 ml-1.5 align-baseline">
              kcal
            </span>
          </>
        ) : (
          "—"
        )}
      </p>

      <p className="text-sm text-zinc-500 mt-2 tabular-nums text-center max-w-full px-1 whitespace-nowrap">
        {hasTarget ? (
          <>
            {kcalConsumed.toLocaleString("de-DE")} von {kcalTarget.toLocaleString("de-DE")} kcal
          </>
        ) : (
          "Ziel fehlt"
        )}
      </p>

      {showProgress && hasTarget && (
        <MacroProgressBar
          consumed={consumed}
          target={target}
          variant="neutral"
          className="h-1.5 mt-4 w-full max-w-[16rem]"
        />
      )}
    </div>
  );
});
