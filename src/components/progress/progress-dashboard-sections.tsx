"use client";

import { memo } from "react";
import Link from "next/link";
import { LazyStatChart } from "@/components/charts/lazy-stat-chart";
import { Trophy, Dumbbell, Flame, Beef, TrendingUp } from "lucide-react";
import { format } from "date-fns";
import { de } from "date-fns/locale";

type NutritionPoint = {
  date: string;
  label: string;
  calories: number;
  proteinG: number;
};

type TrainingSession = {
  id: string;
  name: string;
  dayName: string | null;
  completedAt: string | null;
  durationMin: number | null;
  caloriesBurned: number | null;
};

type Props = {
  nutritionTrend: NutritionPoint[];
  calorieTarget: number;
  proteinTargetG: number;
  trainingHistory: TrainingSession[];
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
    achievedAt: string;
  }[];
  achievements: {
    unlocked: number;
    total: number;
    recent: { name: string; icon: string; tier: string; xpReward: number; earnedAt: string }[];
  };
};

export const ProgressDashboardSections = memo(function ProgressDashboardSections({
  nutritionTrend,
  calorieTarget,
  proteinTargetG,
  trainingHistory,
  streaks,
  personalRecords,
  achievements,
}: Props) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div className="card-premium p-4 text-center">
          <p className="text-[10px] uppercase text-zinc-500">Training-Streak</p>
          <p className="text-2xl font-bold text-orange-400 tabular-nums mt-1">
            {streaks.training?.currentDays ?? 0}
            <span className="text-sm text-zinc-500 font-normal"> Tage</span>
          </p>
          <p className="text-[10px] text-zinc-600 mt-1">
            Best: {streaks.training?.longestDays ?? 0}d
          </p>
        </div>
        <div className="card-premium p-4 text-center">
          <p className="text-[10px] uppercase text-zinc-500">Aktiv-Streak</p>
          <p className="text-2xl font-bold text-cyan-400 tabular-nums mt-1">
            {streaks.active?.currentDays ?? 0}
            <span className="text-sm text-zinc-500 font-normal"> Tage</span>
          </p>
          <p className="text-[10px] text-zinc-600 mt-1">
            Best: {streaks.active?.longestDays ?? 0}d
          </p>
        </div>
      </div>

      {nutritionTrend.length > 0 && (
        <div className="card-premium p-4 space-y-4">
          <div className="flex items-center gap-2">
            <Flame className="h-4 w-4 text-orange-400" />
            <h2 className="text-sm font-semibold text-white">Kalorienverlauf (30 Tage)</h2>
          </div>
          {calorieTarget > 0 && (
            <p className="text-xs text-zinc-500 -mb-2">Ziel: {calorieTarget} kcal / Tag</p>
          )}
          <LazyStatChart
            data={nutritionTrend.map((d) => ({ label: d.label, value: d.calories }))}
            type="area"
            color="#f97316"
          />
          <div className="flex items-center gap-2 pt-2">
            <Beef className="h-4 w-4 text-rose-400" />
            <h2 className="text-sm font-semibold text-white">Proteinverlauf</h2>
          </div>
          {proteinTargetG > 0 && (
            <p className="text-xs text-zinc-500 -mb-2">Ziel: {proteinTargetG} g / Tag</p>
          )}
          <LazyStatChart
            data={nutritionTrend.map((d) => ({ label: d.label, value: d.proteinG }))}
            type="bar"
            color="#fb7185"
          />
        </div>
      )}

      <div className="card-premium p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Dumbbell className="h-4 w-4 text-cyan-400" />
            <h2 className="text-sm font-semibold text-white">Trainingshistorie</h2>
          </div>
          <Link href="/workouts/history" className="text-xs text-cyan-400 hover:underline">
            Alle
          </Link>
        </div>
        {trainingHistory.length === 0 ? (
          <p className="text-sm text-zinc-500">Noch keine abgeschlossenen Workouts.</p>
        ) : (
          <ul className="space-y-2">
            {trainingHistory.map((s) => (
              <li
                key={s.id}
                className="flex items-center justify-between rounded-xl bg-zinc-900/60 px-3 py-2.5"
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium text-white truncate">{s.name}</p>
                  <p className="text-xs text-zinc-500">
                    {s.completedAt
                      ? format(new Date(s.completedAt), "dd. MMM yyyy", { locale: de })
                      : "—"}
                    {s.durationMin != null ? ` · ${s.durationMin} min` : ""}
                  </p>
                </div>
                {s.caloriesBurned != null && s.caloriesBurned > 0 && (
                  <span className="text-xs text-orange-400 tabular-nums shrink-0 ml-2">
                    {s.caloriesBurned} kcal
                  </span>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="card-premium p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Trophy className="h-4 w-4 text-violet-400" />
            <h2 className="text-sm font-semibold text-white">Erfolge</h2>
          </div>
          <Link href="/erfolge" className="text-xs text-violet-400 hover:underline">
            {achievements.unlocked}/{achievements.total}
          </Link>
        </div>
        {achievements.recent.length === 0 ? (
          <p className="text-sm text-zinc-500">Noch keine Trophäen — starte mit Training oder Ernährung.</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {achievements.recent.map((a, i) => (
              <div
                key={`${a.name}-${i}`}
                className="rounded-xl bg-zinc-900/70 px-3 py-2 text-center min-w-[5rem]"
              >
                <span className="text-xl">{a.icon}</span>
                <p className="text-[10px] text-white line-clamp-2 mt-1">{a.name}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="card-premium p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-emerald-400" />
            <h2 className="text-sm font-semibold text-white">Persönliche Rekorde</h2>
          </div>
          <Link href="/workouts/records" className="text-xs text-emerald-400 hover:underline">
            Alle
          </Link>
        </div>
        {personalRecords.length === 0 ? (
          <p className="text-sm text-zinc-500">Noch keine PRs erfasst.</p>
        ) : (
          <ul className="space-y-2">
            {personalRecords.map((pr) => (
              <li
                key={pr.id}
                className="flex items-center justify-between rounded-xl bg-zinc-900/60 px-3 py-2.5"
              >
                <div>
                  <p className="text-sm text-white">{pr.exerciseName}</p>
                  <p className="text-xs text-zinc-500">{pr.recordType}</p>
                </div>
                <p className="text-sm font-bold text-emerald-400 tabular-nums">
                  {pr.value}
                  {pr.reps ? ` × ${pr.reps}` : ""}
                </p>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
});
