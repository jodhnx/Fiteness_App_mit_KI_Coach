"use client";

import { cn } from "@/lib/utils";
import { BADGE_TIER_LABELS, type BadgeTier } from "@/lib/achievement-catalog";
import { tierGradient } from "@/components/gamification/tier-styles";
import type { AchievementProgress } from "@/lib/achievement-engine";

const RARE_TIERS: BadgeTier[] = ["platinum", "diamond", "legendary"];

export function TrophyRoom({ achievements }: { achievements: AchievementProgress[] }) {
  const rare = achievements.filter(
    (a) => a.earned && RARE_TIERS.includes(a.tier as BadgeTier)
  );
  const lockedRare = achievements.filter(
    (a) => !a.earned && RARE_TIERS.includes(a.tier as BadgeTier)
  );

  return (
    <div className="space-y-4">
      <p className="text-sm text-zinc-400">
        Seltene Trophäen — Platin, Diamant und Legendär. Gesammelt: {rare.length} von{" "}
        {rare.length + lockedRare.length}
      </p>
      {rare.length > 0 ? (
        <div className="grid grid-cols-2 gap-3">
          {rare.map((a) => (
            <div
              key={a.id}
              className={cn(
                "rounded-2xl border p-4 text-center",
                "border-amber-500/30 bg-gradient-to-br",
                tierGradient(a.tier)
              )}
            >
              <span className="text-3xl block mb-2">{a.icon}</span>
              <p className="text-sm font-semibold text-white line-clamp-2">{a.name}</p>
              <p className="text-[10px] text-zinc-400 mt-1 uppercase tracking-wide">
                {BADGE_TIER_LABELS[a.tier as BadgeTier]}
              </p>
              <p className="text-xs text-cyan-400 mt-1">+{a.xpReward} XP</p>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm text-zinc-500 py-6 text-center">
          Noch keine seltenen Trophäen — trainiere weiter!
        </p>
      )}
      {lockedRare.length > 0 && (
        <div>
          <p className="text-xs text-zinc-500 mb-2">Fast freigeschaltet</p>
          <div className="space-y-2">
            {lockedRare.slice(0, 4).map((a) => (
              <div
                key={a.id}
                className="rounded-xl border border-white/10 bg-white/[0.02] p-3 flex gap-3 opacity-80"
              >
                <span className="text-2xl grayscale">{a.icon}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-zinc-300">{a.name}</p>
                  <div className="h-1.5 rounded-full bg-zinc-800 mt-2">
                    <div
                      className="h-full rounded-full bg-violet-500/70"
                      style={{ width: `${a.progressPercent}%` }}
                    />
                  </div>
                  <p className="text-[10px] text-zinc-500 mt-1">{a.progressPercent}%</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
