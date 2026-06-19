"use client";

import Link from "next/link";
import { Trophy } from "lucide-react";
import type { HomeDataPayload } from "@/lib/home-defaults";
import { cn } from "@/lib/utils";

type Achievement = NonNullable<HomeDataPayload["recentAchievements"]>[number];

const TIER_RING: Record<string, string> = {
  BRONZE: "ring-amber-700/50",
  SILVER: "ring-zinc-400/50",
  GOLD: "ring-yellow-500/50",
  PLATINUM: "ring-cyan-400/50",
};

export function HomeRecentAchievements({
  achievements,
}: {
  achievements: Achievement[];
}) {
  if (!achievements.length) return null;

  return (
    <div className="rounded-3xl border border-zinc-800 bg-zinc-900/60 p-4">
      <div className="flex items-center justify-between gap-2 mb-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500 flex items-center gap-1.5">
          <Trophy className="h-3.5 w-3.5 text-yellow-500" />
          Letzte Erfolge
        </p>
        <Link href="/erfolge" prefetch className="text-[10px] text-cyan-400">
          Alle
        </Link>
      </div>
      <div className="space-y-2">
        {achievements.map((a) => (
          <div
            key={`${a.name}-${a.earnedAt}`}
            className="flex items-center gap-3 rounded-2xl bg-zinc-950/50 border border-zinc-800/60 px-3 py-2.5"
          >
            <span
              className={cn(
                "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-lg ring-2",
                TIER_RING[a.tier] ?? "ring-zinc-600/40"
              )}
            >
              {a.icon || "🏆"}
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-white truncate">{a.name}</p>
              <p className="text-[10px] text-zinc-500 capitalize">{a.tier.toLowerCase()}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
