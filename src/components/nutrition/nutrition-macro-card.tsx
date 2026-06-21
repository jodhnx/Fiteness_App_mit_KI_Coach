"use client";

import { memo } from "react";
import { cn } from "@/lib/utils";

type Props = {
  emoji: string;
  label: string;
  consumed: number;
  target: number;
  remaining: number;
  unit?: string;
  barColor: string;
  barBg?: string;
  compact?: boolean;
};

export const NutritionMacroCard = memo(function NutritionMacroCard({
  emoji,
  label,
  consumed,
  target,
  remaining,
  unit = "g",
  barColor,
  barBg = "bg-zinc-800",
  compact = false,
}: Props) {
  const pct = target > 0 ? Math.min(100, Math.round((consumed / target) * 100)) : 0;
  const left = Math.max(0, Math.round(remaining));

  if (compact) {
    return (
      <div className="px-2.5 py-2 bg-zinc-950/40">
        <div className="flex items-center gap-1.5 mb-1">
          <span className="text-base leading-none" aria-hidden>
            {emoji}
          </span>
          <span className="text-[11px] font-medium text-white truncate flex-1">{label}</span>
          <span className="text-[10px] text-zinc-500 tabular-nums shrink-0">
            {left}
            {unit}
          </span>
        </div>
        <div className="flex items-center justify-between gap-2 mb-1">
          <p className="text-[10px] text-zinc-500 tabular-nums">
            <span className="text-zinc-300 font-medium">{Math.round(consumed)}</span>
            <span className="text-zinc-600"> / </span>
            {Math.round(target)}
            {unit}
          </p>
        </div>
        <div className={cn("h-1 w-full rounded-full overflow-hidden", barBg)}>
          <div
            className={cn("h-full rounded-full transition-[width] duration-200 ease-out", barColor)}
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl bg-zinc-950/60 border border-zinc-800/80 px-4 py-3.5">
      <div className="flex items-start gap-3">
        <span className="text-2xl leading-none mt-0.5" aria-hidden>
          {emoji}
        </span>
        <div className="flex-1 min-w-0">
          <div className="flex items-baseline justify-between gap-2 mb-1">
            <span className="text-sm font-medium text-white">{label}</span>
            <span className="text-xs text-zinc-500 tabular-nums shrink-0">
              {left}
              {unit} übrig
            </span>
          </div>
          <p className="text-sm text-zinc-400 tabular-nums mb-2.5">
            <span className="text-white font-semibold">{Math.round(consumed)}</span>
            <span className="text-zinc-600"> / </span>
            {Math.round(target)}
            {unit}
          </p>
          <div className={cn("h-1.5 w-full rounded-full overflow-hidden", barBg)}>
            <div
              className={cn("h-full rounded-full transition-[width] duration-200 ease-out", barColor)}
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  );
});
