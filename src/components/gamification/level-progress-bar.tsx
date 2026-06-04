"use client";

import { cn } from "@/lib/utils";

type Props = {
  level: number;
  totalXP: number;
  progressPercent: number;
  xpToNext: number;
  className?: string;
  compact?: boolean;
};

export function LevelProgressBar({
  level,
  totalXP,
  progressPercent,
  xpToNext,
  className,
  compact,
}: Props) {
  return (
    <div className={cn("space-y-1.5", className)}>
      <div className="flex items-center justify-between text-sm">
        <span className="font-semibold text-white">
          Level {level}
          {!compact && (
            <span className="text-zinc-500 font-normal ml-2">{totalXP.toLocaleString("de-DE")} XP</span>
          )}
        </span>
        {level < 100 && (
          <span className="text-zinc-500 text-xs">
            {xpToNext > 0 ? `${xpToNext.toLocaleString("de-DE")} XP bis Level ${level + 1}` : "Max"}
          </span>
        )}
      </div>
      <div className="h-2.5 rounded-full bg-zinc-800 overflow-hidden">
        <div
          className="h-full rounded-full bg-gradient-to-r from-cyan-500 to-violet-500 transition-[width] duration-200 ease-out"
          style={{ width: `${progressPercent}%` }}
        />
      </div>
    </div>
  );
}
