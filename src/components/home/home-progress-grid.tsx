"use client";

import { memo } from "react";
import Link from "next/link";
import {
  Scale,
  Dumbbell,
  Flame,
  Target,
  TrendingDown,
  TrendingUp,
  Minus,
} from "lucide-react";
import type { HomeDataPayload } from "@/lib/home-defaults";
import type { NutritionDashboardPayload } from "@/lib/nutrition-defaults";
import { cn } from "@/lib/utils";

type Props = {
  home: HomeDataPayload;
  nutrition: NutritionDashboardPayload;
  streakDays: number;
  streakHighlight?: boolean;
};

function MiniCard({
  href,
  label,
  value,
  sub,
  icon: Icon,
  accent,
  highlight,
}: {
  href: string;
  label: string;
  value: string;
  sub?: string;
  icon: typeof Scale;
  accent: string;
  highlight?: boolean;
}) {
  return (
    <Link
      href={href}
      prefetch
      className={cn(
        "rounded-xl border p-3 min-h-[5.25rem] flex flex-col justify-between",
        "bg-zinc-900/55 active:scale-[0.98] transition-transform",
        highlight
          ? "border-orange-500/40 shadow-[0_0_20px_-6px_rgba(249,115,22,0.35)]"
          : "border-zinc-800/80"
      )}
    >
      <div className={cn("flex items-center gap-1 text-[9px] uppercase tracking-wider", accent)}>
        <Icon className="h-3 w-3" />
        {label}
      </div>
      <div>
        <p className="text-lg font-bold text-white tabular-nums leading-tight">{value}</p>
        {sub && <p className="text-[10px] text-zinc-500 mt-0.5 tabular-nums">{sub}</p>}
      </div>
    </Link>
  );
}

export const HomeProgressGrid = memo(function HomeProgressGrid({
  home,
  nutrition,
  streakDays,
  streakHighlight,
}: Props) {
  const weightChange = home.weeklyReport?.weightChangeKg ?? null;
  const currentKg = home.bodyTransformation?.currentKg ?? home.weightKg;
  const workoutsWeek = home.weeklyReport?.workouts ?? home.activityWeek.count ?? 0;

  const target = nutrition.targets.calories;
  const consumed = nutrition.consumed.calories;
  const calSuccessPct =
    target > 0 ? Math.min(100, Math.round((consumed / target) * 100)) : 0;

  const WeightIcon =
    weightChange == null ? Minus : weightChange < 0 ? TrendingDown : weightChange > 0 ? TrendingUp : Minus;

  const trendSub =
    weightChange != null
      ? `${weightChange > 0 ? "+" : ""}${weightChange.toFixed(1)} kg · 7T`
      : "7 Tage";

  return (
    <div>
      <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-zinc-500 mb-2 px-0.5">
        Fortschritt auf einen Blick
      </p>
      <div className="grid grid-cols-2 gap-2">
        <MiniCard
          href="/progress"
          label="Gewicht"
          value={
            currentKg != null
              ? `${currentKg.toLocaleString("de-DE", { maximumFractionDigits: 1 })} kg`
              : "—"
          }
          sub={trendSub}
          icon={WeightIcon}
          accent="text-violet-400"
        />
        <MiniCard
          href="/workouts/journey"
          label="Training"
          value={`${workoutsWeek}×`}
          sub="diese Woche"
          icon={Dumbbell}
          accent="text-cyan-400"
        />
        <MiniCard
          href="/nutrition"
          label="Kalorienziel"
          value={`${calSuccessPct}%`}
          sub={target > 0 ? "heute erreicht" : "Ziel fehlt"}
          icon={Target}
          accent="text-orange-400"
          highlight={calSuccessPct >= 85 && calSuccessPct <= 105}
        />
        <MiniCard
          href="/erfolge"
          label="Streak"
          value={streakDays > 0 ? `${streakDays} Tage` : "—"}
          sub="Training"
          icon={Flame}
          accent="text-orange-400"
          highlight={streakHighlight}
        />
      </div>
    </div>
  );
});
