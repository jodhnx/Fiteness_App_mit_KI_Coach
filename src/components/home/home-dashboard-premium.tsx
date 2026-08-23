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
          className="transition-[stroke-dashoffset] duration-500 ease-[cubic-bezier(0.32,0.72,0,1)]"
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
  streakDays: _streakDays,
  trainingStatus,
  trainingLabel,
}: Props) {
  const ready = hasNutritionTargets(nutrition);
  const burned = nutrition.exerciseBurned?.calories ?? 0;
  const burnedEstimated = nutrition.exerciseBurned?.estimated ?? true;
  const remainingCal = nutrition.remaining?.calories ?? 0;
  const consumedCal = nutrition.consumed?.calories ?? 0;
  const targetCal = nutrition.targets?.calories ?? 0;
  const waterConsumed = nutrition.water?.consumedMl ?? 0;
  const waterTarget = nutrition.water?.targetMl ?? 2500;
  const kcalLeft = ready ? Math.max(0, Math.round(remainingCal)) : 0;
  const intakePct =
    targetCal > 0 ? Math.min(100, Math.round((consumedCal / targetCal) * 100)) : 0;
  const stepPct = stepGoal > 0 ? Math.min(100, Math.round((steps / stepGoal) * 100)) : 0;
  const waterPct =
    waterTarget > 0 ? Math.min(100, Math.round((waterConsumed / waterTarget) * 100)) : 0;

  const proteinG = Math.round(nutrition.consumed?.proteinG ?? 0);
  const proteinTarget = Math.round(nutrition.targets?.proteinG ?? 0);
  const carbsG = Math.round(nutrition.consumed?.carbsG ?? 0);
  const carbsTarget = Math.round(nutrition.targets?.carbsG ?? 0);
  const fatG = Math.round(nutrition.consumed?.fatG ?? 0);
  const fatTarget = Math.round(nutrition.targets?.fatG ?? 0);

  const trainMeta = {
    active: { label: "Läuft", color: "text-cyan-400", Icon: Play },
    done: { label: "Erledigt", color: "text-emerald-400", Icon: CheckCircle2 },
    planned: { label: "Geplant", color: "text-violet-400", Icon: Dumbbell },
    open: { label: "Offen", color: "text-zinc-400", Icon: Target },
  }[trainingStatus];

  return (
    <PremiumCard glow padding="md" className="space-y-3">
      {/* Macro chips — compact daily overview */}
      <div className="grid grid-cols-3 gap-2">
        {[
          { label: "Protein", value: proteinG, target: proteinTarget, color: "text-rose-300" },
          { label: "Carbs", value: carbsG, target: carbsTarget, color: "text-amber-300" },
          { label: "Fett", value: fatG, target: fatTarget, color: "text-sky-300" },
        ].map(({ label, value, target, color }) => (
          <div
            key={label}
            className="rounded-xl border border-white/[0.06] bg-white/[0.02] px-2.5 py-2 text-center"
          >
            <p className="text-[9px] uppercase tracking-wide text-zinc-500">{label}</p>
            <p className={cn("text-sm font-bold tabular-nums mt-0.5", color)}>
              {value}
              <span className="text-[10px] font-normal text-zinc-500">
                {target > 0 ? ` / ${target}g` : " g"}
              </span>
            </p>
          </div>
        ))}
      </div>

      <div className="flex items-center justify-between gap-4">
        <div className="min-w-0 flex-1 text-center sm:text-left">
          <p className="text-[10px] uppercase tracking-[0.2em] text-zinc-500">kcal übrig</p>
          <p className="text-[2.75rem] font-bold text-white tabular-nums leading-none mt-1">
            {ready ? kcalLeft.toLocaleString("de-DE") : "—"}
          </p>
          <p className="mt-2 text-xs text-zinc-400 tabular-nums">
            <span className="text-orange-300/90">
              🔥 {Math.round(burned)} kcal verbrannt
              {burned > 0 && burnedEstimated ? " (geschätzt)" : ""}
            </span>
            <span className="mx-1.5 text-zinc-600">·</span>
            <span className="text-cyan-300/90">🚶 {steps.toLocaleString("de-DE")} Schritte</span>
          </p>
        </div>
        <Ring pct={intakePct} color="var(--accent)" size={72}>
          <Flame className="h-4 w-4 text-accent" />
          <span className="text-[10px] font-bold text-white tabular-nums">{intakePct}%</span>
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
            {steps.toLocaleString("de-DE")}
          </p>
          <p className="text-[10px] text-zinc-500 mt-0.5 tabular-nums">Ziel {stepGoal.toLocaleString("de-DE")}</p>
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
              {trainingStatus === "done"
                ? "Workout abgeschlossen"
                : trainingStatus === "planned" && trainingLabel
                  ? trainingLabel
                  : (trainingLabel ?? trainMeta.label)}
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
