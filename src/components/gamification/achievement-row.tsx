"use client";

import { cn } from "@/lib/utils";
import { BADGE_TIER_LABELS, type BadgeTier } from "@/lib/achievement-catalog";
import { tierGradient } from "@/components/gamification/tier-styles";
import type { AchievementProgress } from "@/lib/achievement-engine";

export function AchievementRow({ a }: { a: AchievementProgress }) {
  const displayCurrent = a.earned
    ? a.targetValue
    : Math.min(a.targetValue, Math.floor((a.progressPercent / 100) * a.targetValue));
  const unlockedLabel =
    a.earned && a.earnedAt
      ? new Date(a.earnedAt).toLocaleDateString("de-DE", {
          day: "2-digit",
          month: "2-digit",
          year: "numeric",
        })
      : null;

  return (
    <div
      className={cn(
        "rounded-xl border p-3 transition-colors",
        a.earned
          ? "border-accent/30 bg-accent/5 dark:border-cyan-500/30 dark:bg-cyan-500/5"
          : "border-zinc-200 bg-white shadow-sm dark:border-white/10 dark:bg-white/[0.03] dark:shadow-none"
      )}
    >
      <div className="flex gap-3">
        <div
          className={cn(
            "relative flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br text-xl",
            tierGradient(a.tier),
            !a.earned && "opacity-55 grayscale"
          )}
        >
          {a.icon}
          {!a.earned && a.progressPercent < 1 && (
            <span className="absolute -bottom-1 -right-1 text-[10px]" aria-hidden>
              🔒
            </span>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="font-medium text-zinc-900 text-sm uppercase tracking-wide dark:text-white">
                {a.name}
              </p>
              <p className="text-xs text-zinc-500 line-clamp-2 mt-0.5">{a.description}</p>
            </div>
            <span className="text-[10px] uppercase tracking-wide text-zinc-500 shrink-0">
              {BADGE_TIER_LABELS[a.tier as BadgeTier] ?? a.tier}
            </span>
          </div>
          <div className="mt-2">
            <div className="flex justify-between text-[11px] text-zinc-500 mb-1">
              <span>
                {displayCurrent} / {a.targetValue}
              </span>
              <span>{a.progressPercent}%</span>
            </div>
            <div className="h-1.5 rounded-full bg-zinc-200 dark:bg-zinc-800">
              <div
                className="h-full rounded-full bg-accent/80 dark:bg-cyan-500/80 transition-[width] duration-200"
                style={{ width: `${Math.min(100, a.progressPercent)}%` }}
              />
            </div>
          </div>
          {a.earned ? (
            <p className="text-xs text-accent mt-1.5 dark:text-cyan-400/90">
              ✓ Freigeschaltet
              {unlockedLabel ? ` · ${unlockedLabel}` : ""}
              {` · +${a.xpReward} XP`}
            </p>
          ) : (
            <p className="text-[11px] text-zinc-500 mt-1.5 dark:text-zinc-600">
              Noch nicht erreicht
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
