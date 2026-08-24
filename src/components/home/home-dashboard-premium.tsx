"use client";

import { memo, useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  Droplets,
  Flame,
  Footprints,
  Moon,
  Dumbbell,
  Target,
  CheckCircle2,
  Play,
  Minus,
  Plus,
} from "lucide-react";
import type { NutritionDashboardPayload } from "@/lib/nutrition-defaults";
import { hasNutritionTargets } from "@/lib/nutrition-defaults";
import { PremiumCard } from "@/components/ui/premium-card";
import { cn } from "@/lib/utils";
import { useLivePhoneSteps } from "@/hooks/use-live-phone-steps";
import { hapticTap } from "@/lib/haptic";
import { getCached, setCached } from "@/lib/client-cache";
import { HOME_DATA_CACHE_KEY, HOME_DATA_EVENT } from "@/lib/nutrition-sync";
import type { HomeDataPayload } from "@/lib/home-defaults";
import { toast } from "sonner";
import { format } from "date-fns";
type TrainingStatus = "active" | "done" | "planned" | "open";

type WeekPulse = {
  workouts: number;
  caloriePct: number;
  weightChangeKg: number | null;
  goalReached: boolean;
};

type Props = {
  nutrition: NutritionDashboardPayload;
  steps: number;
  stepGoal: number;
  sleepHours: number | null;
  weightKg: number | null;
  trainingStatus: TrainingStatus;
  trainingLabel?: string;
  activeSessionId?: string | null;
  recoveryScore?: number | null;
  weekPulse?: WeekPulse | null;
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
      <svg width={size} height={size} className="rotate-[-90deg]" aria-hidden>
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

function MacroBar({
  label,
  value,
  target,
  color,
}: {
  label: string;
  value: number;
  target: number;
  color: string;
}) {
  const pct = target > 0 ? Math.min(100, Math.round((value / target) * 100)) : 0;
  const left = target > 0 ? Math.max(0, target - value) : 0;
  return (
    <div className="min-w-0">
      <div className="flex items-baseline justify-between gap-1">
        <p className="text-[10px] font-medium text-zinc-400">{label}</p>
        <p className="text-[11px] font-semibold tabular-nums text-zinc-200">
          {value}
          <span className="font-normal text-zinc-500">
            {target > 0 ? ` / ${target}g` : " g"}
          </span>
        </p>
      </div>
      <div className="mt-1 h-1.5 rounded-full bg-zinc-800 overflow-hidden">
        <div
          className={cn("h-full rounded-full transition-all", color)}
          style={{ width: `${pct}%` }}
        />
      </div>
      {target > 0 && (
        <p className="mt-0.5 text-[10px] tabular-nums text-zinc-500">
          {left > 0 ? `noch ${left}g` : "Ziel erreicht"}
        </p>
      )}
    </div>
  );
}

function trainingHref(
  status: TrainingStatus,
  activeSessionId?: string | null
): string {
  if (status === "active" && activeSessionId) {
    return `/workouts/live/${activeSessionId}`;
  }
  if (status === "planned") return "/workouts/my-plans";
  return "/workouts";
}

/** Premium Home Dashboard — today-first, personal fitness hierarchy. */
export const HomeDashboardPremium = memo(function HomeDashboardPremium({
  nutrition,
  steps: serverSteps,
  stepGoal,
  sleepHours,
  weightKg,
  trainingStatus,
  trainingLabel,
  activeSessionId,
  recoveryScore,
  weekPulse,
}: Props) {
  const steps = useLivePhoneSteps(serverSteps);
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
  const proteinLeft = Math.max(0, proteinTarget - proteinG);
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

  const liveHref = trainingHref(trainingStatus, activeSessionId);

  return (
    <PremiumCard glow padding="md" className="space-y-3.5">
      {trainingStatus === "active" && (
        <Link
          href={liveHref}
          className="flex min-h-11 items-center gap-3 rounded-2xl border border-cyan-500/35 bg-cyan-500/12 px-3 py-2.5 active:scale-[0.99] transition-transform"
        >
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-cyan-500/20">
            <Play className="h-4 w-4 text-cyan-300" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-cyan-300/90">
              Training läuft
            </p>
            <p className="text-sm font-semibold text-white truncate">
              Tippen zum Fortsetzen
            </p>
          </div>
        </Link>
      )}

      <div className="flex items-center justify-between gap-4">
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-zinc-400">
            kcal übrig
          </p>
          {ready ? (
            <p className="mt-1 text-[2.65rem] font-bold leading-none tabular-nums text-white">
              {kcalLeft.toLocaleString("de-DE")}
            </p>
          ) : (
            <Link
              href="/settings"
              className="mt-2 inline-flex min-h-11 items-center text-sm font-semibold text-accent"
            >
              Kalorienziel festlegen
            </Link>
          )}
          {ready && proteinTarget > 0 && (
            <p className="mt-2 text-sm font-medium tabular-nums text-rose-200/90">
              {proteinLeft > 0
                ? `Noch ${proteinLeft} g Protein`
                : "Proteinziel erreicht"}
            </p>
          )}
          <p className="mt-1.5 text-xs tabular-nums text-zinc-400">
            <span className="text-orange-300/90">
              {Math.round(burned)} kcal verbrannt
              {burned > 0 && burnedEstimated ? " (geschätzt)" : ""}
            </span>
          </p>
        </div>
        <Ring pct={intakePct} color="var(--accent)" size={76}>
          <Flame className="h-4 w-4 text-accent" />
          <span className="text-[11px] font-bold tabular-nums text-white">{intakePct}%</span>
        </Ring>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <MacroBar
          label="Protein"
          value={proteinG}
          target={proteinTarget}
          color="bg-rose-400"
        />
        <MacroBar
          label="Carbs"
          value={carbsG}
          target={carbsTarget}
          color="bg-amber-400"
        />
        <MacroBar label="Fett" value={fatG} target={fatTarget} color="bg-sky-400" />
      </div>

      <div className="grid grid-cols-2 gap-2">
        <Link
          href={liveHref}
          className={cn(
            "flex min-h-14 items-center gap-3 rounded-2xl border p-3 active:scale-[0.98] transition-transform",
            trainingStatus === "active"
              ? "border-cyan-500/30 bg-cyan-500/10"
              : "border-white/[0.06] bg-white/[0.03]"
          )}
        >
          <trainMeta.Icon className={cn("h-5 w-5 shrink-0", trainMeta.color)} />
          <div className="min-w-0">
            <p className="text-[10px] font-medium uppercase tracking-wide text-zinc-400">
              Training
            </p>
            <p className={cn("text-sm font-semibold truncate", trainMeta.color)}>
              {trainingStatus === "done"
                ? "Workout abgeschlossen"
                : trainingStatus === "planned" && trainingLabel
                  ? trainingLabel
                  : (trainingLabel ?? trainMeta.label)}
            </p>
          </div>
        </Link>

        <HomeWeightNudge weightKg={weightKg} />
      </div>

      <Link
        href="/gesundheit"
        className="flex min-h-11 items-center justify-between gap-3 rounded-2xl border border-white/[0.06] bg-white/[0.03] px-3 py-2.5 active:scale-[0.99] transition-transform"
      >
        <div className="flex min-w-0 items-center gap-2">
          <Moon className="h-4 w-4 shrink-0 text-indigo-400" />
          <div className="min-w-0">
            <p className="text-[10px] font-medium uppercase tracking-wide text-zinc-400">
              Regeneration
            </p>
            <p className="text-sm font-semibold tabular-nums text-white">
              {sleepHours != null ? `${sleepHours.toFixed(1)} h Schlaf` : "Schlaf offen"}
            </p>
          </div>
        </div>
        {recoveryScore != null && (
          <p className="shrink-0 text-sm font-bold tabular-nums text-indigo-300">
            {Math.round(recoveryScore)}%
          </p>
        )}
      </Link>

      {weekPulse && (
        <div className="grid grid-cols-4 gap-1.5">
          {[
            {
              label: "Training",
              value: `${weekPulse.workouts}×`,
              href: "/workouts",
            },
            {
              label: "Ernährung",
              value: `${weekPulse.caloriePct}%`,
              href: "/nutrition",
            },
            {
              label: "Gewicht",
              value:
                weekPulse.weightChangeKg != null
                  ? `${weekPulse.weightChangeKg > 0 ? "+" : ""}${weekPulse.weightChangeKg.toFixed(1)}`
                  : "—",
              href: "/progress",
            },
            {
              label: "Ziel",
              value: weekPulse.goalReached ? "✓" : "—",
              href: "/progress",
            },
          ].map((item) => (
            <Link
              key={item.label}
              href={item.href}
              className="rounded-xl border border-white/[0.06] bg-white/[0.02] px-1.5 py-2 text-center active:scale-[0.98] transition-transform"
            >
              <p className="text-[9px] font-medium uppercase tracking-wide text-zinc-500">
                {item.label}
              </p>
              <p className="mt-0.5 text-sm font-bold tabular-nums text-zinc-100">
                {item.value}
              </p>
            </Link>
          ))}
        </div>
      )}

      <div className="grid grid-cols-2 gap-2">
        <Link
          href="/gesundheit"
          className="rounded-2xl border border-white/[0.06] bg-white/[0.03] p-2.5 active:scale-[0.98] transition-transform"
        >
          <div className="mb-1 flex items-center gap-1.5">
            <Footprints className="h-3.5 w-3.5 text-cyan-400" />
            <span className="text-[10px] font-medium uppercase text-zinc-400">Schritte</span>
          </div>
          <p className="text-base font-bold tabular-nums text-white">
            {steps.toLocaleString("de-DE")}
          </p>
          <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-zinc-800">
            <div
              className="h-full rounded-full bg-cyan-400 transition-all"
              style={{ width: `${stepPct}%` }}
            />
          </div>
        </Link>

        <Link
          href="/nutrition"
          className="rounded-2xl border border-white/[0.06] bg-white/[0.03] p-2.5 active:scale-[0.98] transition-transform"
        >
          <div className="mb-1 flex items-center gap-1.5">
            <Droplets className="h-3.5 w-3.5 text-sky-400" />
            <span className="text-[10px] font-medium uppercase text-zinc-400">Wasser</span>
          </div>
          <p className="text-base font-bold tabular-nums text-white">
            {Math.round(waterConsumed / 100) / 10}L
          </p>
          <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-zinc-800">
            <div
              className="h-full rounded-full bg-sky-400 transition-all"
              style={{ width: `${waterPct}%` }}
            />
          </div>
        </Link>
      </div>
    </PremiumCard>
  );
});

function HomeWeightNudge({ weightKg }: { weightKg: number | null }) {
  const [kg, setKg] = useState(weightKg);
  const [saved, setSaved] = useState(false);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const flashTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setKg(weightKg);
  }, [weightKg]);

  useEffect(() => {
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
      if (flashTimer.current) clearTimeout(flashTimer.current);
    };
  }, []);

  const persist = useCallback((next: number) => {
    const home = getCached<HomeDataPayload>(HOME_DATA_CACHE_KEY, { allowStale: true });
    if (home) {
      const merged = { ...home, weightKg: next };
      setCached(HOME_DATA_CACHE_KEY, merged, 900_000);
      window.dispatchEvent(new CustomEvent(HOME_DATA_EVENT, { detail: merged }));
    }
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      const today = format(new Date(), "yyyy-MM-dd");
      void fetch("/api/progress", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date: today, weightKg: next }),
      }).then((res) => {
        if (!res.ok) {
          toast.error("Gewicht nicht gespeichert");
          return;
        }
        setSaved(true);
        if (flashTimer.current) clearTimeout(flashTimer.current);
        flashTimer.current = setTimeout(() => setSaved(false), 1400);
      });
    }, 450);
  }, []);

  const nudge = (delta: number) => {
    hapticTap();
    const base = kg ?? 70;
    const next = Math.round((base + delta) * 10) / 10;
    setKg(next);
    persist(next);
  };

  const display =
    kg != null ? kg.toLocaleString("de-DE", { maximumFractionDigits: 1 }) : "—";

  return (
    <div
      className={cn(
        "flex items-center gap-1.5 rounded-2xl border p-2",
        saved ? "border-emerald-500/35 bg-emerald-500/10" : "border-white/[0.06] bg-white/[0.03]"
      )}
    >
      <button
        type="button"
        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-zinc-900 text-zinc-200 touch-manipulation active:scale-95 active:bg-zinc-800"
        aria-label="0,1 Kilogramm weniger"
        onClick={() => nudge(-0.1)}
      >
        <Minus className="h-4 w-4" />
      </button>
      <Link href="/progress?log=1" className="min-w-0 flex-1 py-1">
        <p className="text-[10px] font-medium uppercase tracking-wide text-zinc-400">
          {saved ? "Gespeichert" : "Gewicht"}
        </p>
        <p
          className="text-sm font-semibold tabular-nums text-white"
          aria-live="polite"
        >
          {kg != null ? `${display} kg` : "—"}
        </p>
      </Link>
      <button
        type="button"
        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-zinc-900 text-zinc-200 touch-manipulation active:scale-95 active:bg-zinc-800"
        aria-label="0,1 Kilogramm mehr"
        onClick={() => nudge(0.1)}
      >
        <Plus className="h-4 w-4" />
      </button>
    </div>
  );
}
