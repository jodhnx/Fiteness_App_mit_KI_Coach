"use client";

import { useMemo } from "react";
import { cn } from "@/lib/utils";
import { BADGE_TIER_LABELS, type BadgeTier } from "@/lib/achievement-catalog";
import { tierGradient } from "@/components/gamification/tier-styles";
import type { AchievementProgress } from "@/lib/achievement-engine";

const TROPHY_TIERS: BadgeTier[] = [
  "bronze",
  "silver",
  "gold",
  "platinum",
  "diamond",
  "legendary",
];

const TIER_SECTION_LABELS: Record<BadgeTier, string> = {
  bronze: "Bronze Trophäen",
  silver: "Silber Trophäen",
  gold: "Gold Trophäen",
  platinum: "Platin Trophäen",
  diamond: "Diamant Trophäen",
  legendary: "Legendäre Trophäen",
};

export function TrophyRoom({ achievements }: { achievements: AchievementProgress[] }) {
  const byTier = useMemo(() => {
    const map = new Map<BadgeTier, { earned: AchievementProgress[]; locked: AchievementProgress[] }>();
    for (const t of TROPHY_TIERS) {
      map.set(t, { earned: [], locked: [] });
    }
    for (const a of achievements) {
      const tier = a.tier as BadgeTier;
      if (!TROPHY_TIERS.includes(tier)) continue;
      const bucket = map.get(tier)!;
      if (a.earned) bucket.earned.push(a);
      else bucket.locked.push(a);
    }
    return map;
  }, [achievements]);

  const totalEarned = achievements.filter((a) => a.earned).length;

  return (
    <div className="space-y-6">
      <p className="text-sm text-zinc-400">
        Trophäenraum — gesammelt: {totalEarned} von {achievements.length} Erfolgen
      </p>
      {TROPHY_TIERS.map((tier) => {
        const { earned, locked } = byTier.get(tier) ?? { earned: [], locked: [] };
        if (earned.length === 0 && locked.length === 0) return null;
        return (
          <section key={tier} className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-white">{TIER_SECTION_LABELS[tier]}</h3>
              <span className="text-xs text-zinc-500">
                {earned.length} / {earned.length + locked.length}
              </span>
            </div>
            {earned.length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {earned.map((a) => (
                  <div
                    key={a.id}
                    className={cn(
                      "rounded-2xl border p-3 text-center",
                      "border-white/10 bg-gradient-to-br",
                      tierGradient(a.tier)
                    )}
                  >
                    <span className="text-2xl block mb-1">{a.icon}</span>
                    <p className="text-xs font-semibold text-white line-clamp-2">{a.name}</p>
                    <p className="text-[10px] text-cyan-400/90 mt-1">+{a.xpReward} XP</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-zinc-600 py-2">
                Noch keine {BADGE_TIER_LABELS[tier]}-Trophäen — weiter sammeln!
              </p>
            )}
            {locked.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {locked.slice(0, 6).map((a) => (
                  <div
                    key={a.id}
                    title={a.name}
                    className="h-10 w-10 rounded-xl border border-white/5 bg-zinc-900/80 flex items-center justify-center grayscale opacity-50"
                  >
                    <span className="text-lg">{a.icon}</span>
                  </div>
                ))}
                {locked.length > 6 && (
                  <span className="text-xs text-zinc-500 self-center">+{locked.length - 6}</span>
                )}
              </div>
            )}
          </section>
        );
      })}
    </div>
  );
}
