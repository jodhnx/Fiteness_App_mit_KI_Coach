"use client";

import { cn } from "@/lib/utils";
import { BADGE_TIER_LABELS, type BadgeTier } from "@/lib/achievement-catalog";
import { tierGradient } from "@/components/gamification/tier-styles";
import type { AchievementProgress } from "@/lib/achievement-engine";

export function AchievementRow({ a }: { a: AchievementProgress }) {
  const displayCurrent = a.earned ? a.targetValue : Math.min(a.targetValue, Math.floor((a.progressPercent / 100) * a.targetValue));

  return (
    <div
      className={cn(
        "rounded-xl border p-3 transition-colors",
        a.earned ? "border-cyan-500/30 bg-cyan-500/5" : "border-white/10 bg-white/[0.03]"
      )}
    >
      <div className="flex gap-3">
        <div
          className={cn(
            "flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br text-xl",
            tierGradient(a.tier)
          )}
        >
          {a.icon}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="font-medium text-white text-sm">{a.name}</p>
              <p className="text-xs text-zinc-500 line-clamp-1">{a.description}</p>
            </div>
            <span className="text-[10px] uppercase tracking-wide text-zinc-500 shrink-0">
              {BADGE_TIER_LABELS[a.tier as BadgeTier] ?? a.tier}
            </span>
          </div>
          {!a.earned && (
            <div className="mt-2">
              <div className="flex justify-between text-[11px] text-zinc-500 mb-1">
                <span>
                  {displayCurrent} / {a.targetValue}
                </span>
                <span>{a.progressPercent}%</span>
              </div>
              <div className="h-1.5 rounded-full bg-zinc-800">
                <div
                  className="h-full rounded-full bg-cyan-500/80 transition-[width] duration-200"
                  style={{ width: `${a.progressPercent}%` }}
                />
              </div>
            </div>
          )}
          {a.earned && (
            <p className="text-xs text-cyan-400/90 mt-1">+{a.xpReward} XP · freigeschaltet</p>
          )}
        </div>
      </div>
    </div>
  );
}
