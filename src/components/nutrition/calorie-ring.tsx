"use client";

import { memo, useId, useMemo } from "react";
import { cn } from "@/lib/utils";

type Props = {
  consumed: number;
  target: number;
  remaining: number;
  size?: number;
  className?: string;
  label?: string;
  ringId?: string;
  /** "remaining" (default) or "target" — personal calorie goal in the center */
  centerMode?: "remaining" | "target";
};

export const CalorieRing = memo(function CalorieRing({
  consumed,
  target,
  remaining,
  size = 168,
  className,
  label = "ÜBRIG",
  ringId,
  centerMode = "remaining",
}: Props) {
  const autoId = useId();
  const gradientId = ringId ?? `kcal-ring-${autoId.replace(/:/g, "")}`;
  const safeTarget = Math.max(target, 1);
  const hasTarget = target > 0;
  const kcalConsumed = Math.round(consumed);
  const kcalTarget = Math.round(target);
  const overBy = hasTarget ? Math.max(0, kcalConsumed - kcalTarget) : 0;
  const isOver = overBy > 0;
  const pct = hasTarget
    ? Math.min(100, Math.round((kcalConsumed / safeTarget) * 100))
    : 0;
  const r = (size - 16) / 2;
  const c = 2 * Math.PI * r;
  const offset = c - (pct / 100) * c;
  const strokeW = size >= 200 ? 12 : size >= 140 ? 10 : 8;

  const showTarget = centerMode === "target" && hasTarget && !isOver;
  const centerValue = isOver
    ? overBy
    : showTarget
      ? kcalTarget
      : hasTarget
        ? Math.max(0, Math.round(remaining))
        : 0;
  const centerLabel = isOver ? "ÜBER ZIEL" : showTarget ? label || "TAGESZIEL" : label;

  const numberSizeClass = useMemo(() => {
    const digits = String(centerValue).length;
    if (size >= 200) {
      return digits >= 4 ? "text-3xl" : "text-4xl";
    }
    if (size >= 150) {
      return digits >= 4 ? "text-2xl" : digits >= 3 ? "text-3xl" : "text-[2rem]";
    }
    return digits >= 4 ? "text-xl" : "text-2xl";
  }, [centerValue, size]);

  return (
    <div className={cn("flex flex-col items-center gap-2", className)}>
      <div className="relative mx-auto shrink-0" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90" aria-hidden>
          <defs>
            <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="100%">
              {isOver ? (
                <>
                  <stop offset="0%" stopColor="#ef4444" />
                  <stop offset="100%" stopColor="#f87171" />
                </>
              ) : (
                <>
                  <stop offset="0%" stopColor="#f97316" />
                  <stop offset="100%" stopColor="#fb923c" />
                </>
              )}
            </linearGradient>
          </defs>
          <circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            stroke="rgba(255,255,255,0.07)"
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
              className="transition-[stroke-dashoffset,stroke] duration-500 ease-[cubic-bezier(0.32,0.72,0,1)]"
            />
          )}
        </svg>

        <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-2 min-w-0 pointer-events-none">
          <p
            className={cn(
              "text-[10px] font-semibold uppercase tracking-[0.15em] leading-none",
              isOver ? "text-red-400" : "text-zinc-500"
            )}
          >
            {centerLabel}
          </p>
          <p
            className={cn(
              "font-bold tabular-nums leading-none mt-1",
              numberSizeClass,
              isOver ? "text-red-400" : "text-white"
            )}
          >
            {hasTarget ? centerValue.toLocaleString("de-DE") : "—"}
          </p>
          {showTarget && (
            <p className="text-[10px] font-medium text-zinc-400 mt-0.5 leading-none">kcal</p>
          )}
          <p className="text-[10px] text-zinc-500 mt-1 tabular-nums leading-tight whitespace-nowrap max-w-full">
            {hasTarget ? (
              showTarget ? (
                <>{kcalConsumed.toLocaleString("de-DE")} verbraucht</>
              ) : (
                <>
                  {kcalConsumed.toLocaleString("de-DE")} /{" "}
                  {kcalTarget.toLocaleString("de-DE")} kcal
                </>
              )
            ) : (
              "Ziel fehlt"
            )}
          </p>
        </div>
      </div>

      {isOver && (
        <p className="text-sm font-medium text-red-400 text-center tabular-nums px-2">
          {overBy.toLocaleString("de-DE")} kcal über deinem Tagesziel
        </p>
      )}
    </div>
  );
});
