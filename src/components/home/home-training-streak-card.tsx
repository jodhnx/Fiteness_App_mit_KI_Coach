"use client";

import { memo } from "react";
import Link from "next/link";
import { Flame } from "lucide-react";

export const HomeTrainingStreakCard = memo(function HomeTrainingStreakCard({
  streakDays,
}: {
  streakDays: number;
}) {
  return (
    <Link
      href="/workouts/journey"
      prefetch
      className="flex items-center gap-4 rounded-2xl border border-orange-500/20 bg-orange-950/15 p-4 active:scale-[0.995] transition-transform"
    >
      <div className="h-12 w-12 rounded-2xl bg-orange-500/15 flex items-center justify-center shrink-0">
        <Flame className="h-6 w-6 text-orange-400" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-xs font-semibold uppercase tracking-wide text-orange-300/80">
          Trainingsstreak
        </p>
        <p className="text-2xl font-bold text-white tabular-nums mt-0.5">
          {streakDays > 0 ? streakDays : "0"}
          <span className="text-sm font-medium text-zinc-500 ml-1">
            {streakDays === 1 ? "Tag" : "Tage"}
          </span>
        </p>
        <p className="text-xs text-zinc-500 mt-0.5">
          {streakDays > 0 ? "Weiter so — täglich trainieren" : "Starte heute deinen Streak"}
        </p>
      </div>
    </Link>
  );
});
