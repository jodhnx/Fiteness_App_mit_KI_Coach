"use client";

import Link from "next/link";
import { Trophy, ChevronRight, Target } from "lucide-react";
import { LevelProgressBar } from "@/components/gamification/level-progress-bar";
import type { HomeDataPayload } from "@/lib/home-defaults";

export function HomeAchievementsCard({ g }: { g: NonNullable<HomeDataPayload["gamification"]> }) {
  return (
    <Link
      href="/erfolge"
      prefetch
      className="block rounded-2xl border border-amber-500/25 bg-gradient-to-br from-amber-500/10 via-zinc-900/80 to-violet-500/10 p-4 transition-colors hover:border-amber-500/40 active:scale-[0.99]"
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-lg">🏆</span>
          <h2 className="font-semibold text-white">Erfolge</h2>
        </div>
        <ChevronRight className="h-5 w-5 text-zinc-500" />
      </div>

      <LevelProgressBar
        level={g.level}
        totalXP={g.totalXP}
        progressPercent={g.progressPercent}
        xpToNext={g.xpToNext}
        compact
      />

      <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
        <div className="rounded-lg bg-black/30 px-2.5 py-2">
          <p className="text-zinc-500 flex items-center gap-1">
            <Trophy className="h-3 w-3 text-amber-400" /> Erfolge
          </p>
          <p className="text-white font-semibold mt-0.5">
            {g.unlockedCount} / {g.totalAchievements}
          </p>
        </div>
        {g.activeChallenge ? (
          <div className="rounded-lg bg-black/30 px-2.5 py-2">
            <p className="text-zinc-500 flex items-center gap-1">
              <Target className="h-3 w-3 text-cyan-400" /> Challenge
            </p>
            <p className="text-white font-semibold mt-0.5 truncate">{g.activeChallenge.title}</p>
            <p className="text-zinc-500">
              {g.activeChallenge.progress} / {g.activeChallenge.target}
            </p>
          </div>
        ) : g.latestAchievement ? (
          <div className="rounded-lg bg-black/30 px-2.5 py-2">
            <p className="text-zinc-500">Neuester Erfolg</p>
            <p className="text-white font-semibold mt-0.5 truncate">
              {g.latestAchievement.icon} {g.latestAchievement.name}
            </p>
          </div>
        ) : null}
      </div>
    </Link>
  );
}
