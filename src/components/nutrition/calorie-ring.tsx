"use client";

import { memo, useId } from "react";
import { cn } from "@/lib/utils";

type Props = {
  consumed: number;
  target: number;
  remaining: number;
  size?: number;
  className?: string;
  label?: string;
  ringId?: string;
  /** ringOnly = decorative ring without center text (use NutritionCalorieSummary for text) */
  variant?: "default" | "ringOnly";
};

export const CalorieRing = memo(function CalorieRing({
  consumed,
  target,
  remaining,
  size = 168,
  className,
  label = "ÜBRIG",
  ringId,
  variant = "default",
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

  const ringSvg = (
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
  );

  if (variant === "ringOnly") {
    return (
      <div className={cn("relative mx-auto", className)} style={{ width: size, height: size }}>
        {ringSvg}
      </div>
    );
  }

  return (
    <div className={cn("relative mx-auto", className)} style={{ width: size, height: size }}>
      {ringSvg}
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-3 min-w-0">
        <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-zinc-500 truncate w-full">
          {label}
        </p>
        <p
          className={cn(
            "font-bold text-white tabular-nums leading-none mt-1 w-full",
            size >= 200 ? "text-4xl" : size >= 160 ? "text-3xl" : "text-2xl"
          )}
        >
          {hasTarget ? Math.max(0, Math.round(remaining)).toLocaleString("de-DE") : "—"}
        </p>
        <p className="text-[11px] text-zinc-500 mt-1.5 tabular-nums truncate w-full max-w-full px-0.5">
          {hasTarget ? (
            <>
              {Math.round(consumed).toLocaleString("de-DE")} von{" "}
              {Math.round(target).toLocaleString("de-DE")} kcal
            </>
          ) : (
            "Ziel fehlt"
          )}
        </p>
      </div>
    </div>
  );
});
