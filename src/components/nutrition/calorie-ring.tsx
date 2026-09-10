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

/** Single remaining-kcal ring — quiet, compact, Apple-like. */
export const CalorieRing = memo(function CalorieRing({
  consumed,
  target,
  remaining,
  exerciseBurned,
  size = 120,
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
  const r = (size - 12) / 2;
  const c = 2 * Math.PI * r;
  const offset = c - (pct / 100) * c;
  const strokeW = 7;
  const digits = String(centerValue).length;
  const numberClass =
    digits >= 5 ? "text-xl" : digits >= 4 ? "text-2xl" : "text-[1.75rem]";

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
                  <stop offset="0%" stopColor="#e4e4e7" />
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
            />
          )}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-2 pointer-events-none">
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
              "mt-1 text-[10px] font-medium leading-none",
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
