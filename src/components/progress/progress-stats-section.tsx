"use client";

import { memo, useMemo } from "react";
import Link from "next/link";
import { Trophy, TrendingUp, Clock, Dumbbell, Flame } from "lucide-react";

type Props = {
  trainingHistory: {
    id: string;
    name: string;
    dayName: string | null;
    completedAt: string | null;
    durationMin: number | null;
  }[];
  streaks: {
    training: { currentDays: number; longestDays: number } | null;
    active: { currentDays: number; longestDays: number } | null;
  };
  personalRecords: {
    id: string;
    exerciseName: string;
    recordType: string;
    value: number;
    reps: number | null;
  }[];
};

export const ProgressStatsSection = memo(function ProgressStatsSection({
  trainingHistory,
  streaks,
  personalRecords,
}: Props) {
  const { totalMin, trainingWeeks, topExercises } = useMemo(() => {
    let min = 0;
    const weekSet = new Set<string>();
    const exCount = new Map<string, number>();

    for (const s of trainingHistory) {
      min += s.durationMin ?? 0;
      if (s.completedAt) {
        const d = new Date(s.completedAt);
        weekSet.add(`${d.getFullYear()}-W${Math.ceil((d.getDate() + 6 - d.getDay()) / 7)}-${d.getMonth()}`);
      }
      if (s.dayName) {
        exCount.set(s.dayName, (exCount.get(s.dayName) ?? 0) + 1);
      }
    }

    const top = [...exCount.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([name, count]) => ({ name, count }));

    return {
      totalMin: min,
      trainingWeeks: weekSet.size,
      topExercises: top,
    };
  }, [trainingHistory]);

  const bodyAreas = useMemo(() => {
    const areas = new Map<string, number>();
    for (const pr of personalRecords) {
      const key = pr.recordType.includes("VOLUME") ? "Volumen" : "Kraft";
      areas.set(key, (areas.get(key) ?? 0) + 1);
    }
    return [...areas.entries()];
  }, [personalRecords]);

  return (
    <div className="card-premium p-4 space-y-4">
      <h2 className="text-sm font-semibold text-white">📊 Statistiken</h2>

      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-xl bg-zinc-900/70 p-3">
          <Clock className="h-4 w-4 text-cyan-400 mb-1" />
          <p className="text-lg font-bold text-white tabular-nums">{trainingWeeks}</p>
          <p className="text-[10px] text-zinc-500 uppercase">Trainingswochen</p>
        </div>
        <div className="rounded-xl bg-zinc-900/70 p-3">
          <Flame className="h-4 w-4 text-orange-400 mb-1" />
          <p className="text-lg font-bold text-white tabular-nums">{Math.round(totalMin / 60)}h</p>
          <p className="text-[10px] text-zinc-500 uppercase">Gesamtzeit</p>
        </div>
        <div className="rounded-xl bg-zinc-900/70 p-3">
          <TrendingUp className="h-4 w-4 text-emerald-400 mb-1" />
          <p className="text-lg font-bold text-white tabular-nums">
            {streaks.training?.currentDays ?? 0}
          </p>
          <p className="text-[10px] text-zinc-500 uppercase">Training-Streak</p>
        </div>
        <div className="rounded-xl bg-zinc-900/70 p-3">
          <Trophy className="h-4 w-4 text-violet-400 mb-1" />
          <p className="text-lg font-bold text-white tabular-nums">{personalRecords.length}</p>
          <p className="text-[10px] text-zinc-500 uppercase">Rekorde</p>
        </div>
      </div>

      {topExercises.length > 0 && (
        <div>
          <p className="text-xs text-zinc-500 mb-2 flex items-center gap-1">
            <Dumbbell className="h-3.5 w-3.5" />
            Häufigste Split-Tage
          </p>
          <ul className="space-y-1">
            {topExercises.map((e) => (
              <li key={e.name} className="flex justify-between text-sm">
                <span className="text-zinc-300">{e.name}</span>
                <span className="text-zinc-500 tabular-nums">{e.count}×</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {bodyAreas.length > 0 && (
        <div>
          <p className="text-xs text-zinc-500 mb-2">Fortschritt pro Körperbereich</p>
          <div className="flex flex-wrap gap-2">
            {bodyAreas.map(([area, n]) => (
              <span
                key={area}
                className="rounded-lg bg-zinc-800/80 px-3 py-1.5 text-xs text-zinc-300"
              >
                {area}: {n} PRs
              </span>
            ))}
          </div>
        </div>
      )}

      <Link href="/workouts/records" className="text-xs text-cyan-400 hover:underline block">
        Alle Rekorde ansehen →
      </Link>
    </div>
  );
});
