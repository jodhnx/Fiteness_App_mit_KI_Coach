"use client";

import { memo } from "react";
import Link from "next/link";
import {
  Droplets,
  Flame,
  Footprints,
  Moon,
  Scale,
  Dumbbell,
  Target,
  CheckCircle2,
  Play,
} from "lucide-react";
import type { NutritionDashboardPayload } from "@/lib/nutrition-defaults";
import { hasNutritionTargets } from "@/lib/nutrition-defaults";
import { PremiumCard } from "@/components/ui/premium-card";
import { cn } from "@/lib/utils";

type TrainingStatus = "active" | "done" | "planned" | "open";

type Props = {
  nutrition: NutritionDashboardPayload;
  steps: number;
  stepGoal: number;
  sleepHours: number | null;
  weightKg: number | null;
  streakDays: number;
  trainingStatus: TrainingStatus;
  trainingLabel?: string;
};

function Ring({
  pct,
  color,
  size = 64,
  children,
}: {
  pct: number;
  color: string;
  size?: number;
  children: React.ReactNode;
}) {
  const r = (size - 8) / 2;
  const c = 2 * Math.PI * r;
  const offset = c - (Math.min(100, Math.max(0, pct)) / 100) * c;
  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="rotate-[-90deg]">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="rgba(255,255,255,0.06)"
          strokeWidth={5}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={5}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={offset}
          className="transition-[stroke-dashoffset] duration-500"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        {children}
      </div>
    </div>
  );
}

/** Premium Home Dashboard 2.0 — Apple Fitness / Whoop inspired. */
export const HomeDashboardPremium = memo(function HomeDashboardPremium({
  nutrition,
  steps,
  stepGoal,
  sleepHours,
  weightKg,
  streakDays,
  trainingStatus,
  trainingLabel,
}: Props) {
  const ready = hasNutritionTargets(nutrition);
  const remainingCal = nutrition.remaining?.calories ?? 0;
  const consumedCal = nutrition.consumed?.calories ?? 0;
  const targetCal = nutrition.targets?.calories ?? 0;
  const waterConsumed = nutrition.water?.consumedMl ?? 0;
  const waterTarget = nutrition.water?.targetMl ?? 2500;
  const kcalLeft = ready ? Math.max(0, Math.round(remainingCal)) : 0;
  const kcalTarget = Math.round(targetCal);
  const kcalPct =
    kcalTarget > 0 ? Math.min(100, Math.round((consumedCal / kcalTarget) * 100)) : 0;
  const stepPct = stepGoal > 0 ? Math.min(100, Math.round((steps / stepGoal) * 100)) : 0;
  const waterPct =
    waterTarget > 0 ? Math.min(100, Math.round((waterConsumed / waterTarget) * 100)) : 0;

  const trainMeta = {
    active: { label: "Läuft", color: "text-cyan-400", Icon: Play },
    done: { label: "Erledigt", color: "text-emerald-400", Icon: CheckCircle2 },
    planned: { label: "Geplant", color: "text-violet-400", Icon: Dumbbell },
    open: { label: "Offen", color: "text-zinc-400", Icon: Target },
  }[trainingStatus];

  return (
    <PremiumCard glow padding="md" className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <div className="min-w-0 flex-1">
          <p className="text-[10px] uppercase tracking-widest text-zinc-500">
            Kalorien übrig
          </p>
          <p className="text-3xl font-bold text-white tabular-nums mt-0.5">
            {ready ? kcalLeft.toLocaleString("de-DE") : "—"}
            <span className="text-sm font-normal text-zinc-500 ml-1.5">kcal</span>
          </p>
          <p className="text-xs text-zinc-500 mt-1">
            Ziel {kcalTarget > 0 ? kcalTarget.toLocaleString("de-DE") : "—"} · Streak{" "}
            {streakDays > 0 ? `${streakDays}T` : "—"}
          </p>
        </div>
        <Ring pct={kcalPct} color="var(--accent)" size={72}>
          <Flame className="h-4 w-4 text-accent" />
          <span className="text-[10px] font-bold text-white tabular-nums">{kcalPct}%</span>
        </Ring>
      </div>

      <div className="grid grid-cols-3 gap-2">
        <Link
          href="/gesundheit"
          className="rounded-2xl bg-white/[0.03] border border-white/[0.06] p-2.5 active:scale-[0.98] transition-transform"
        >
          <div className="flex items-center gap-1.5 mb-1">
            <Footprints className="h-3.5 w-3.5 text-cyan-400" />
            <span className="text-[9px] uppercase text-zinc-500">Schritte</span>
          </div>
          <p className="text-base font-bold text-white tabular-nums">
            {steps >= 1000 ? `${(steps / 1000).toFixed(1)}k` : steps}
          </p>
          <div className="mt-1.5 h-1 rounded-full bg-zinc-800 overflow-hidden">
            <div
              className="h-full rounded-full bg-cyan-400 transition-all"
              style={{ width: `${stepPct}%` }}
            />
          </div>
        </Link>

        <Link
          href="/gesundheit"
          className="rounded-2xl bg-white/[0.03] border border-white/[0.06] p-2.5 active:scale-[0.98] transition-transform"
        >
          <div className="flex items-center gap-1.5 mb-1">
            <Moon className="h-3.5 w-3.5 text-indigo-400" />
            <span className="text-[9px] uppercase text-zinc-500">Schlaf</span>
          </div>
          <p className="text-base font-bold text-white tabular-nums">
            {sleepHours != null ? `${sleepHours.toFixed(1)}h` : "—"}
          </p>
          <p className="text-[10px] text-zinc-600 mt-1">letzte Nacht</p>
        </Link>

        <Link
          href="/nutrition"
          className="rounded-2xl bg-white/[0.03] border border-white/[0.06] p-2.5 active:scale-[0.98] transition-transform"
        >
          <div className="flex items-center gap-1.5 mb-1">
            <Droplets className="h-3.5 w-3.5 text-sky-400" />
            <span className="text-[9px] uppercase text-zinc-500">Wasser</span>
          </div>
          <p className="text-base font-bold text-white tabular-nums">
            {Math.round(waterConsumed / 100) / 10}L
          </p>
          <div className="mt-1.5 h-1 rounded-full bg-zinc-800 overflow-hidden">
            <div
              className="h-full rounded-full bg-sky-400 transition-all"
              style={{ width: `${waterPct}%` }}
            />
          </div>
        </Link>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <Link
          href={
            trainingStatus === "active"
              ? "/workouts"
              : trainingStatus === "planned"
                ? "/workouts/my-plans"
                : "/workouts"
          }
          className={cn(
            "flex items-center gap-3 rounded-2xl border p-3 active:scale-[0.98] transition-transform",
            trainingStatus === "active"
              ? "border-cyan-500/30 bg-cyan-500/10"
              : "border-white/[0.06] bg-white/[0.03]"
          )}
        >
          <trainMeta.Icon className={cn("h-5 w-5 shrink-0", trainMeta.color)} />
          <div className="min-w-0">
            <p className="text-[9px] uppercase text-zinc-500">Training</p>
            <p className={cn("text-sm font-semibold truncate", trainMeta.color)}>
              {trainingLabel ?? trainMeta.label}
            </p>
          </div>
        </Link>

        <Link
          href="/progress?log=1"
          className="flex items-center gap-3 rounded-2xl border border-white/[0.06] bg-white/[0.03] p-3 active:scale-[0.98] transition-transform"
        >
          <Scale className="h-5 w-5 shrink-0 text-violet-400" />
          <div className="min-w-0">
            <p className="text-[9px] uppercase text-zinc-500">Gewicht</p>
            <p className="text-sm font-semibold text-white tabular-nums">
              {weightKg != null
                ? `${weightKg.toLocaleString("de-DE", { maximumFractionDigits: 1 })} kg`
                : "—"}
            </p>
          </div>
        </Link>
      </div>
    </PremiumCard>
  );
});
