"use client";

import { memo } from "react";
import { cn } from "@/lib/utils";

type Props = {
  consumed: number;
  target: number;
  remaining: number;
  size?: number;
  className?: string;
};

export const CalorieRing = memo(function CalorieRing({
  consumed,
  target,
  remaining,
  size = 168,
  className,
}: Props) {
  const safeTarget = Math.max(target, 1);
  const pct = Math.min(100, Math.round((consumed / safeTarget) * 100));
  const r = (size - 14) / 2;
  const c = 2 * Math.PI * r;
  const offset = c - (pct / 100) * c;
  const hasTarget = target > 0;

  return (
    <div className={cn("relative mx-auto", className)} style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90 drop-shadow-sm">
        <defs>
          <linearGradient id="kcal-ring-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#22d3ee" />
            <stop offset="100%" stopColor="#34d399" />
          </linearGradient>
        </defs>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="rgba(255,255,255,0.06)"
          strokeWidth={10}
        />
        {hasTarget && (
          <circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            stroke="url(#kcal-ring-gradient)"
            strokeWidth={10}
            strokeLinecap="round"
            strokeDasharray={c}
            strokeDashoffset={offset}
            className="transition-[stroke-dashoffset] duration-300 ease-out"
          />
        )}
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-3">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-cyan-400/90">
          Übrig
        </p>
        <p className="text-4xl font-extrabold text-white tabular-nums leading-none mt-0.5">
          {hasTarget ? Math.max(0, Math.round(remaining)).toLocaleString("de-DE") : "—"}
        </p>
        <p className="text-[11px] text-zinc-500 mt-1 tabular-nums">
          {hasTarget ? (
            <>
              {Math.round(consumed)} / {Math.round(target)} kcal
            </>
          ) : (
            "Ziel fehlt"
          )}
        </p>
      </div>
    </div>
  );
});
