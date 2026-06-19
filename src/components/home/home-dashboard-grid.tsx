"use client";

import { memo } from "react";
import Link from "next/link";
import {
  Droplets,
  Dumbbell,
  Flame,
  Footprints,
  Scale,
  Sparkles,
  Target,
  TrendingUp,
  Zap,
} from "lucide-react";
import type { HomeDataPayload } from "@/lib/home-defaults";
import type { NutritionDashboardPayload } from "@/lib/nutrition-defaults";
import { cn } from "@/lib/utils";

type Props = {
  home: HomeDataPayload;
  nutrition: NutritionDashboardPayload;
};

function StatTile({
  href,
  icon: Icon,
  label,
  value,
  sub,
  accent,
}: {
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  sub?: string;
  accent: string;
}) {
  return (
    <Link
      href={href}
      prefetch
      className={cn(
        "rounded-2xl border border-white/10 bg-zinc-900/60 p-3.5 min-h-[5.5rem]",
        "active:scale-[0.98] transition-transform transform-gpu"
      )}
    >
      <div className={cn("flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide", accent)}>
        <Icon className="h-3.5 w-3.5" aria-hidden />
        {label}
      </div>
      <p className="text-xl font-bold text-white tabular-nums mt-1.5 leading-none">{value}</p>
      {sub && <p className="text-[10px] text-zinc-500 mt-1 tabular-nums">{sub}</p>}
    </Link>
  );
}

export const HomeDashboardGrid = memo(function HomeDashboardGrid({ home, nutrition }: Props) {
  const proteinLeft = Math.max(0, Math.round(nutrition.remaining.proteinG));
  const proteinTarget = Math.round(nutrition.targets.proteinG);
  const waterMl = nutrition.water?.consumedMl ?? 0;
  const waterTarget = nutrition.water?.targetMl ?? nutrition.targets.waterTargetMl ?? 2500;
  const waterPct = waterTarget > 0 ? Math.round((waterMl / waterTarget) * 100) : 0;
  const steps = home.healthToday?.steps ?? 0;
  const stepGoal = home.healthToday?.stepGoal ?? 10000;
  const streak = home.trainingStreak?.currentDays ?? home.streak?.currentDays ?? 0;
  const weekWorkouts = home.activityWeek?.count ?? 0;
  const g = home.gamification;
  const weightKg = home.weightKg;
  const weightTrend = home.bodyTransformation?.progressPercent;
  const nextWorkout = home.nextWorkout;

  return (
    <div className="grid grid-cols-2 gap-2">
      <StatTile
        href="/nutrition"
        icon={Flame}
        label="Kalorien übrig"
        value={String(Math.max(0, Math.round(nutrition.remaining.calories)))}
        sub={`${Math.round(nutrition.consumed.calories)} / ${Math.round(nutrition.targets.calories)} kcal`}
        accent="text-orange-400"
      />
      <StatTile
        href="/nutrition"
        icon={Target}
        label="Protein übrig"
        value={`${proteinLeft}g`}
        sub={proteinTarget > 0 ? `Ziel ${proteinTarget}g` : undefined}
        accent="text-emerald-400"
      />
      <StatTile
        href="/nutrition"
        icon={Droplets}
        label="Wasser"
        value={`${(waterMl / 1000).toFixed(1)}L`}
        sub={`${waterPct}% · Ziel ${(waterTarget / 1000).toFixed(1)}L`}
        accent="text-sky-400"
      />
      <StatTile
        href="/activities"
        icon={Footprints}
        label="Schritte"
        value={steps > 0 ? steps.toLocaleString("de-AT") : "—"}
        sub={`${stepGoal > 0 ? Math.min(100, Math.round((steps / stepGoal) * 100)) : 0}% Ziel`}
        accent="text-violet-400"
      />
      <StatTile
        href="/progress"
        icon={Scale}
        label="Gewicht"
        value={weightKg != null ? `${weightKg} kg` : "—"}
        sub={
          weightTrend != null
            ? `${weightTrend}% zum Ziel`
            : home.weightGoal
              ? `${home.weightGoal.percent}% Fortschritt`
              : "Trend tracken"
        }
        accent="text-amber-400"
      />
      <StatTile
        href="/workouts"
        icon={TrendingUp}
        label="Training"
        value={`${weekWorkouts}×`}
        sub="Diese Woche"
        accent="text-cyan-400"
      />
      <StatTile
        href="/workouts"
        icon={Dumbbell}
        label="Nächstes Training"
        value={nextWorkout ? nextWorkout.dayName.slice(0, 12) : "—"}
        sub={nextWorkout?.planName}
        accent="text-pink-400"
      />
      <StatTile
        href="/erfolge"
        icon={Zap}
        label="Streak"
        value={streak > 0 ? `${streak} Tage` : "—"}
        sub={g ? `Level ${g.level} · ${g.totalXP} XP` : "Training & Erfolge"}
        accent="text-yellow-400"
      />
      {g && (
        <Link
          href="/erfolge"
          prefetch
          className="col-span-2 rounded-2xl border border-cyan-500/20 bg-cyan-500/10 p-3.5 active:scale-[0.98] transition-transform"
        >
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-cyan-400" />
              <span className="text-sm font-semibold text-white">
                Level {g.level} · {g.levelName}
              </span>
            </div>
            <span className="text-xs text-cyan-300 tabular-nums">{g.progressPercent}%</span>
          </div>
          <div className="h-1.5 rounded-full bg-zinc-800 mt-2 overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-cyan-500 to-teal-400 rounded-full transition-all"
              style={{ width: `${Math.min(100, g.progressPercent)}%` }}
            />
          </div>
          <p className="text-[10px] text-zinc-500 mt-1 tabular-nums">
            Noch {g.xpToNext} XP bis Level {g.level + 1}
          </p>
        </Link>
      )}
    </div>
  );
});
