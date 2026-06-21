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
};

export const CalorieRing = memo(function CalorieRing({
  consumed,
  target,
  remaining,
  size = 168,
  className,
  label = "ÜBRIG",
  ringId,
}: Props) {
  const autoId = useId();
  const gradientId = ringId ?? `kcal-ring-${autoId.replace(/:/g, "")}`;
  const safeTarget = Math.max(target, 1);
  const pct = Math.min(100, Math.round((consumed / safeTarget) * 100));
  const r = (size - 16) / 2;
  const c = 2 * Math.PI * r;
  const offset = c - (pct / 100) * c;
  const hasTarget = target > 0;
  const strokeW = size >= 200 ? 12 : size >= 140 ? 10 : 8;

  const kcalLeft = hasTarget ? Math.max(0, Math.round(remaining)) : 0;
  const kcalConsumed = Math.round(consumed);
  const kcalTarget = Math.round(target);

  const numberSizeClass = useMemo(() => {
    const digits = String(kcalLeft).length;
    if (size >= 200) {
      return digits >= 4 ? "text-3xl" : "text-4xl";
    }
    if (size >= 150) {
      return digits >= 4 ? "text-2xl" : digits >= 3 ? "text-3xl" : "text-[2rem]";
    }
    return digits >= 4 ? "text-xl" : "text-2xl";
  }, [kcalLeft, size]);

  return (
    <div
      className={cn("relative mx-auto shrink-0", className)}
      style={{ width: size, height: size }}
    >
      <svg width={size} height={size} className="-rotate-90" aria-hidden>
        <defs>
          <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#f97316" />
            <stop offset="100%" stopColor="#fb923c" />
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
            className="transition-[stroke-dashoffset] duration-300 ease-out"
          />
        )}
      </svg>

      <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-2 min-w-0 pointer-events-none">
        <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-zinc-500 leading-none">
          {label}
        </p>
        <p
          className={cn(
            "font-bold text-white tabular-nums leading-none mt-1",
            numberSizeClass
          )}
        >
          {hasTarget ? kcalLeft.toLocaleString("de-DE") : "—"}
        </p>
        <p className="text-[10px] text-zinc-500 mt-1 tabular-nums leading-tight whitespace-nowrap max-w-full">
          {hasTarget ? (
            <>
              {kcalConsumed.toLocaleString("de-DE")} / {kcalTarget.toLocaleString("de-DE")} kcal
            </>
          ) : (
            "Ziel fehlt"
          )}
        </p>
      </div>
    </div>
  );
});
