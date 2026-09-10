"use client";

import { memo, useId } from "react";
import { cn } from "@/lib/utils";
import { getCalorieDisplay } from "@/lib/nutrition-display";

type Props = {
  consumed: number;
  target: number;
  remaining: number;
  exerciseBurned?: number;
  size?: number;
  className?: string;
};

/** Single remaining-kcal ring — primary Nutrition visualization. */
export const CalorieRing = memo(function CalorieRing({
  consumed,
  target,
  remaining,
  exerciseBurned,
  size = 168,
  className,
}: Props) {
  const autoId = useId();
  const gradientId = `kcal-ring-${autoId.replace(/:/g, "")}`;
  const safeTarget = Math.max(target, 1);
  const hasTarget = target > 0;
  const kcalConsumed = Math.round(consumed);
  const kcalTarget = Math.round(target);
  const calDisplay = hasTarget
    ? getCalorieDisplay(kcalConsumed, kcalTarget, remaining, exerciseBurned)
    : null;
  const isOver = Boolean(calDisplay?.isOver);
  const centerValue = calDisplay?.primaryValue ?? 0;
  const pct = hasTarget
    ? Math.min(100, Math.round((kcalConsumed / safeTarget) * 100))
    : 0;
  const strokeW = Math.max(8, Math.round(size * 0.048));
  const r = (size - strokeW * 1.5) / 2;
  const c = 2 * Math.PI * r;
  const offset = c - (pct / 100) * c;
  const digits = String(centerValue).length;
  const numberClass =
    digits >= 5
      ? "text-2xl"
      : digits >= 4
        ? "text-[1.85rem]"
        : "text-[2.15rem]";

  return (
    <div className={cn("flex flex-col items-center", className)}>
      <div className="relative mx-auto shrink-0" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90" aria-hidden>
          <defs>
            <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="100%">
              {isOver ? (
                <>
                  <stop offset="0%" stopColor="#f87171" />
                  <stop offset="100%" stopColor="#ef4444" />
                </>
              ) : (
                <>
                  <stop offset="0%" stopColor="#f4f4f5" />
                  <stop offset="100%" stopColor="#a1a1aa" />
                </>
              )}
            </linearGradient>
          </defs>
          <circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            stroke="rgba(255,255,255,0.08)"
            strokeWidth={strokeW}
          />
          {hasTarget && (
            <circle
              cx={size / 2}
              cy={size / 2}
              r={r}
              fill="none"
              stroke={`url(#${gradientId})`}
              strokeWidth={strokeW}
              strokeLinecap="round"
              strokeDasharray={c}
              strokeDashoffset={offset}
              className="transition-[stroke-dashoffset] duration-500 ease-out"
            />
          )}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-3 pointer-events-none">
          <p
            className={cn(
              "font-semibold tabular-nums leading-none tracking-tight",
              numberClass,
              isOver ? "text-red-400" : "text-white"
            )}
          >
            {hasTarget ? centerValue.toLocaleString("de-DE") : "—"}
          </p>
          <p
            className={cn(
              "mt-1.5 text-[11px] font-medium leading-none",
              isOver ? "text-red-400/80" : "text-zinc-500"
            )}
          >
            {isOver ? "kcal über Ziel" : "kcal übrig"}
          </p>
        </div>
      </div>
    </div>
  );
});
