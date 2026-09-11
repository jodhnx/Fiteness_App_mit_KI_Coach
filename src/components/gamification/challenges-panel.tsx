"use client";

import Link from "next/link";
import { cn } from "@/lib/utils";
import type { ChallengeWithProgress } from "@/lib/challenge-progress";
import { BADGE_TIER_LABELS } from "@/lib/achievement-catalog";
import type { BadgeTier } from "@/lib/achievement-catalog";
import { PERIOD_LABELS } from "@/components/gamification/tier-styles";
import { Trophy } from "lucide-react";

const TIER_STYLE: Record<string, string> = {
  none: "border-zinc-200 bg-white dark:border-zinc-700 dark:bg-transparent",
  bronze: "border-amber-300 bg-amber-50 dark:border-amber-700/50 dark:bg-amber-950/20",
  silver: "border-zinc-300 bg-zinc-50 dark:border-zinc-400/40 dark:bg-zinc-800/40",
  gold: "border-yellow-300 bg-yellow-50 dark:border-yellow-500/50 dark:bg-yellow-950/25",
  platinum: "border-slate-300 bg-slate-50 dark:border-slate-300/40 dark:bg-slate-800/30",
  diamond: "border-sky-300 bg-sky-50 dark:border-cyan-400/40 dark:bg-cyan-950/20",
  legendary: "border-violet-300 bg-violet-50 dark:border-violet-400/50 dark:bg-violet-950/25",
};

type Props = {
  challenges: ChallengeWithProgress[];
  hideHeader?: boolean;
};

export function ChallengesPanel({ challenges, hideHeader }: Props) {
  if (challenges.length === 0) return null;
  return (
    <div className={hideHeader ? "space-y-2" : "card-premium p-4 space-y-3"}>
      {!hideHeader && (
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold text-zinc-900 flex items-center gap-2 dark:text-white">
            <Trophy className="h-4 w-4 text-amber-500" />
            Challenges
          </p>
          <Link href="/erfolge" className="text-xs text-accent hover:underline">
            Alle
          </Link>
        </div>
      )}
      <div className="space-y-2">
        {challenges.map((c) => {
          const pct =
            c.targetDays > 0 ? Math.min(100, Math.round((c.progress / c.targetDays) * 100)) : 0;
          const tierLabel =
            c.tier !== "none"
              ? BADGE_TIER_LABELS[c.tier as BadgeTier] ?? c.tier
              : "";
          return (
            <div key={c.id} className={cn("rounded-xl border p-3", TIER_STYLE[c.tier] ?? TIER_STYLE.none)}>
              <div className="flex justify-between gap-2">
                <p className="text-sm font-medium text-zinc-900 dark:text-white">{c.title}</p>
                <div className="text-right shrink-0">
                  {tierLabel && (
                    <span className="text-[10px] uppercase text-zinc-400 block">{tierLabel}</span>
                  )}
                  <span className="text-[10px] text-zinc-600">
                    {PERIOD_LABELS[c.period] ?? c.period}
                  </span>
                </div>
              </div>
              <p className="text-[11px] text-zinc-500 mt-0.5">{c.description}</p>
              <div className="h-1.5 rounded-full bg-zinc-200 mt-2 overflow-hidden dark:bg-zinc-800">
                <div
                  className="h-full bg-accent rounded-full transition-[width] duration-200"
                  style={{ width: `${pct}%` }}
                />
              </div>
              <p className="text-[10px] text-zinc-500 mt-1 tabular-nums">
                {c.progress.toLocaleString("de-DE")} / {c.targetDays.toLocaleString("de-DE")}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
