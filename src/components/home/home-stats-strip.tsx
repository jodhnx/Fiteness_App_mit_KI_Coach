"use client";

import { memo } from "react";
import Link from "next/link";
import { Flame, Scale, Trophy } from "lucide-react";
import { cn } from "@/lib/utils";

type Props = {
  weightKg: number | null;
  streakDays: number;
  level: number;
  levelName?: string;
  highlight?: "streak" | null;
};

export const HomeStatsStrip = memo(function HomeStatsStrip({
  weightKg,
  streakDays,
  level,
  levelName,
  highlight,
}: Props) {
  return (
    <div className="flex gap-2 -mt-1 mb-1">
      <Link
        href="/progress?log=1"
        prefetch
        className={cn(
          "flex-1 flex items-center gap-2 rounded-xl border px-3 py-2",
          "bg-zinc-900/60 border-zinc-800/80 active:scale-[0.98] transition-transform"
        )}
      >
        <Scale className="h-3.5 w-3.5 text-violet-400 shrink-0" />
        <div className="min-w-0">
          <p className="text-[9px] uppercase tracking-wider text-zinc-500">Gewicht</p>
          <p className="text-sm font-bold text-white tabular-nums truncate">
            {weightKg != null
              ? `${weightKg.toLocaleString("de-DE", { maximumFractionDigits: 1 })} kg`
              : "—"}
          </p>
        </div>
      </Link>

      <Link
        href="/erfolge"
        prefetch
        className={cn(
          "flex-1 flex items-center gap-2 rounded-xl border px-3 py-2 transition-transform active:scale-[0.98]",
          highlight === "streak"
            ? "bg-orange-500/10 border-orange-500/40 shadow-[0_0_24px_-6px_rgba(249,115,22,0.45)]"
            : "bg-zinc-900/60 border-zinc-800/80"
        )}
      >
        <Flame
          className={cn(
            "h-3.5 w-3.5 shrink-0",
            highlight === "streak" ? "text-orange-400" : "text-orange-500/80"
          )}
        />
        <div className="min-w-0">
          <p className="text-[9px] uppercase tracking-wider text-zinc-500">Streak</p>
          <p className="text-sm font-bold text-white tabular-nums">
            {streakDays > 0 ? `${streakDays} Tage` : "—"}
          </p>
        </div>
      </Link>

      <Link
        href="/erfolge"
        prefetch
        className={cn(
          "flex-1 flex items-center gap-2 rounded-xl border px-3 py-2",
          "bg-zinc-900/60 border-zinc-800/80 active:scale-[0.98] transition-transform"
        )}
      >
        <Trophy className="h-3.5 w-3.5 text-cyan-400 shrink-0" />
        <div className="min-w-0">
          <p className="text-[9px] uppercase tracking-wider text-zinc-500">Level</p>
          <p className="text-sm font-bold text-white tabular-nums truncate">
            {level > 0 ? level : "—"}
            {levelName && level > 0 && (
              <span className="text-[10px] font-normal text-zinc-500 ml-0.5 hidden sm:inline">
                {levelName.split(" ")[0]}
              </span>
            )}
          </p>
        </div>
      </Link>
    </div>
  );
});
