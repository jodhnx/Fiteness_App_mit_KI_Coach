"use client";

import { memo } from "react";

type MacroRingProps = {
  label: string;
  consumed: number;
  target: number;
  unit?: string;
  color?: string;
  size?: number;
};

export const MacroRing = memo(function MacroRing({
  label,
  consumed,
  target,
  unit = "",
  color = "#22d3ee",
  size = 96,
}: MacroRingProps) {
  const safeTarget = Math.max(target, 1);
  const pct = Math.min(100, Math.round((consumed / safeTarget) * 100));
  const remaining = Math.max(0, Math.round(target - consumed));
  const r = (size - 10) / 2;
  const c = 2 * Math.PI * r;
  const offset = c - (pct / 100) * c;

  return (
    <div className="flex flex-col items-center gap-2 min-w-[88px]">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90">
          <circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            stroke="rgba(255,255,255,0.08)"
            strokeWidth={8}
          />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            stroke={color}
            strokeWidth={8}
            strokeLinecap="round"
            strokeDasharray={c}
            strokeDashoffset={offset}
            className="transition-all duration-200"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
          <span className="text-lg font-bold text-white leading-none">
            {Math.round(consumed)}
          </span>
          <span className="text-[10px] text-zinc-500">/ {Math.round(target)}{unit}</span>
        </div>
      </div>
      <div className="text-center">
        <p className="text-sm font-medium text-white">{label}</p>
        <p className="text-xs text-zinc-500">{remaining}{unit} übrig</p>
      </div>
    </div>
  );
});
