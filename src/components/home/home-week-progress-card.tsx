"use client";

import { memo } from "react";
import Link from "next/link";
import type { HomeDataPayload } from "@/lib/home-defaults";
import { HomeWeeklyIntelligenceCard } from "@/components/home/home-weekly-intelligence-card";
import { cn } from "@/lib/utils";
import { Dumbbell, Target, TrendingDown, TrendingUp, Minus, ChevronRight } from "lucide-react";

type Props = {
  home: HomeDataPayload;
  streakDays?: number;
  weeklyIntelligence?: HomeDataPayload["weeklyIntelligence"];
};

export const HomeWeekProgressCard = memo(function HomeWeekProgressCard({
  home,
  streakDays = 0,
  weeklyIntelligence,
}: Props) {
  const w = home.weeklyReport;
  const week = home.activityWeek;
  const workouts = w?.workouts ?? week.count ?? 0;

  const calorieLabel = w?.goalReached
    ? "Ziel erreicht"
    : w?.avgCaloriesKcal && home.calorieTarget > 0
      ? `Ø ${Math.round(w.avgCaloriesKcal)} kcal`
      : "—";

  const calorieSub = w?.goalReached
    ? "Diese Woche"
    : home.calorieTarget > 0 && w?.avgCaloriesKcal
      ? `Ziel ${Math.round(home.calorieTarget)}`
      : "Kalorien";

  const weightKg = w?.weightChangeKg ?? null;
  const weightLabel =
    weightKg != null
      ? `${weightKg > 0 ? "+" : ""}${weightKg.toLocaleString("de-DE", { maximumFractionDigits: 1 })} kg`
      : home.weightKg != null
        ? `${home.weightKg.toLocaleString("de-DE", { maximumFractionDigits: 1 })} kg`
        : "—";

  const WeightIcon =
    weightKg == null ? Minus : weightKg < 0 ? TrendingDown : weightKg > 0 ? TrendingUp : Minus;

  return (
    <div className="space-y-0">
      <Link
        href="/progress"
        prefetch
        className="block rounded-3xl border border-zinc-800 bg-zinc-900/70 p-4 active:scale-[0.99] transition-transform"
      >
        <div className="flex items-center justify-between gap-2 mb-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
            Wochenfortschritt
          </p>
          <span className="text-[10px] text-zinc-600 flex items-center gap-0.5">
            {w?.weekLabel ?? "Diese Woche"}
            <ChevronRight className="h-3 w-3" />
          </span>
        </div>

        <div className="grid grid-cols-3 gap-2">
          <WeekStat
            icon={Dumbbell}
            label="Trainings"
            value={`${workouts}×`}
            sub={streakDays > 0 ? `${streakDays}d Streak` : "diese Woche"}
            accent="text-cyan-400"
          />
          <WeekStat
            icon={Target}
            label="Kalorienziel"
            value={calorieLabel}
            sub={calorieSub}
            accent={w?.goalReached ? "text-emerald-400" : "text-amber-400"}
          />
          <WeekStat
            icon={WeightIcon}
            label="Gewichtstrend"
            value={weightLabel}
            sub={weightKg != null ? "7 Tage" : "kein Trend"}
            accent={
              weightKg == null
                ? "text-zinc-500"
                : weightKg <= 0
                  ? "text-emerald-400"
                  : "text-rose-400"
            }
          />
        </div>

        {w?.summaryLine && (
          <p className="text-[11px] text-zinc-500 mt-3 line-clamp-2">{w.summaryLine}</p>
        )}
      </Link>

      <HomeWeeklyIntelligenceCard intelligence={weeklyIntelligence ?? home.weeklyIntelligence} />
    </div>
  );
});

function WeekStat({
  icon: Icon,
  label,
  value,
  sub,
  accent,
}: {
  icon: typeof Dumbbell;
  label: string;
  value: string;
  sub: string;
  accent: string;
}) {
  return (
    <div className="rounded-2xl bg-zinc-950/50 border border-zinc-800/60 px-2 py-3 text-center min-h-[5.5rem] flex flex-col justify-center">
      <Icon className={cn("h-4 w-4 mx-auto mb-1", accent)} />
      <p className="text-[9px] text-zinc-600 uppercase tracking-wide leading-tight">{label}</p>
      <p className="text-sm font-bold text-white tabular-nums mt-0.5 leading-tight">{value}</p>
      <p className="text-[9px] text-zinc-600 mt-0.5 leading-tight">{sub}</p>
    </div>
  );
}
