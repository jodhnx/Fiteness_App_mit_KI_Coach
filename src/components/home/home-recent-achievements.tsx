"use client";

import { memo } from "react";
import Link from "next/link";
import { Trophy } from "lucide-react";
import { format } from "date-fns";
import { de } from "date-fns/locale";
import type { HomeDataPayload } from "@/lib/home-defaults";
import { cn } from "@/lib/utils";

type Achievement = NonNullable<HomeDataPayload["recentAchievements"]>[number];

const TIER_GLOW: Record<string, string> = {
  BRONZE: "shadow-[0_0_12px_-2px_rgba(180,83,9,0.5)] ring-amber-700/40",
  SILVER: "shadow-[0_0_12px_-2px_rgba(161,161,170,0.4)] ring-zinc-400/40",
  GOLD: "shadow-[0_0_14px_-2px_rgba(234,179,8,0.55)] ring-yellow-500/45",
  PLATINUM: "shadow-[0_0_14px_-2px_rgba(34,211,238,0.45)] ring-cyan-400/45",
};

export const HomeRecentAchievements = memo(function HomeRecentAchievements({
  achievements,
}: {
  achievements: Achievement[];
}) {
  if (!achievements.length) return null;

  return (
    <div className="rounded-[1.25rem] border border-zinc-800/90 bg-zinc-900/45 p-4">
      <div className="flex items-center justify-between gap-2 mb-3">
        <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-zinc-500 flex items-center gap-1.5">
          <Trophy className="h-3.5 w-3.5 text-yellow-500" />
          Erfolge
        </p>
        <Link href="/erfolge" prefetch className="text-[10px] text-cyan-400 font-medium">
          Alle
        </Link>
      </div>
      <div className="space-y-2">
        {achievements.slice(0, 3).map((a) => {
          const dateLabel = a.earnedAt
            ? format(new Date(a.earnedAt), "d. MMM", { locale: de })
            : null;
          return (
            <div
              key={`${a.name}-${a.earnedAt}`}
              className="flex items-center gap-3 rounded-xl bg-zinc-950/60 border border-zinc-800/50 px-3 py-2.5"
            >
              <span
                className={cn(
                  "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-lg ring-1",
                  TIER_GLOW[a.tier] ?? "ring-zinc-600/30"
                )}
              >
                {a.icon || "🏆"}
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-white truncate">{a.name}</p>
                {dateLabel && (
                  <p className="text-[10px] text-zinc-500 mt-0.5">{dateLabel}</p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
});
