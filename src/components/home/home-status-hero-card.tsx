"use client";

import { memo } from "react";
import Link from "next/link";
import {
  Droplets,
  Dumbbell,
  Flame,
  Footprints,
  CheckCircle2,
  Play,
} from "lucide-react";
import type { NutritionDashboardPayload } from "@/lib/nutrition-defaults";
import { hasNutritionTargets } from "@/lib/nutrition-defaults";
import { MacroProgressBar } from "@/components/home/macro-progress-bar";
import { cn } from "@/lib/utils";

type TrainingStatus = "active" | "done" | "planned" | "open";

type Props = {
  nutrition: NutritionDashboardPayload;
  steps: number;
  stepGoal: number;
  trainingStatus: TrainingStatus;
  highlight?: "calories" | "training" | null;
};

export const HomeStatusHeroCard = memo(function HomeStatusHeroCard({
  nutrition,
  steps,
  stepGoal,
  trainingStatus,
  highlight,
}: Props) {
  const { consumed, targets, remaining, water } = nutrition;
  const ready = hasNutritionTargets(nutrition);
  const kcalLeft = ready ? Math.max(0, Math.round(remaining.calories)) : 0;
  const kcalTarget = Math.round(targets.calories);
  const kcalConsumed = Math.round(consumed.calories);
  const stepPct = stepGoal > 0 ? Math.min(100, Math.round((steps / stepGoal) * 100)) : 0;
  const waterPct =
    water.targetMl > 0
      ? Math.min(100, Math.round((water.consumedMl / water.targetMl) * 100))
      : 0;

  const trainingLabel = {
    active: "Läuft",
    done: "Erledigt",
    planned: "Geplant",
    open: "Offen",
  }[trainingStatus];

  const TrainingIcon =
    trainingStatus === "active"
      ? Play
      : trainingStatus === "done"
        ? CheckCircle2
        : Dumbbell;

  return (
    <div
      className={cn(
        "relative rounded-[1.35rem] overflow-hidden border",
        highlight === "calories"
          ? "border-orange-500/45 shadow-[0_0_48px_-10px_rgba(249,115,22,0.5)]"
          : highlight === "training"
            ? "border-cyan-500/40 shadow-[0_0_48px_-10px_rgba(34,211,238,0.35)]"
            : "border-white/10 shadow-[0_12px_40px_-16px_rgba(0,0,0,0.8)]"
      )}
    >
      <div
        className={cn(
          "absolute inset-0 bg-gradient-to-br pointer-events-none",
          highlight === "calories"
            ? "from-orange-600/25 via-zinc-950 to-zinc-950"
            : highlight === "training"
              ? "from-cyan-600/20 via-zinc-950 to-zinc-950"
              : "from-violet-600/15 via-zinc-950 to-zinc-950"
        )}
      />
      <div className="relative p-5 pb-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-xs font-bold uppercase tracking-[0.2em] text-zinc-400">
            Heutiger Status
          </h2>
          <Flame className="h-4 w-4 text-orange-400/90" aria-hidden />
        </div>

        <Link href="/nutrition" prefetch className="block text-center active:opacity-95">
          {!ready ? (
            <p className="text-sm text-zinc-400 py-2">Kalorienziel in Einstellungen festlegen</p>
          ) : (
            <>
              <p className="text-[10px] uppercase tracking-[0.25em] text-zinc-500">Kalorien übrig</p>
              <p className="text-[clamp(2rem,9vw,3.25rem)] font-bold text-white tabular-nums leading-none mt-1 tracking-tight">
                {kcalLeft.toLocaleString("de-DE")}
                <span className="text-[0.42em] font-semibold text-zinc-400 ml-1.5">kcal</span>
              </p>
              <p className="text-xs text-zinc-500 mt-2 tabular-nums whitespace-nowrap">
                {kcalConsumed.toLocaleString("de-DE")} von {kcalTarget.toLocaleString("de-DE")} kcal
              </p>
            </>
          )}
          {ready && (
            <MacroProgressBar
              consumed={consumed.calories}
              target={targets.calories}
              variant="neutral"
              className="h-1.5 mt-4 max-w-xs mx-auto"
            />
          )}
        </Link>
      </div>

      <div className="relative grid grid-cols-2 gap-px bg-white/[0.06] border-t border-white/10">
        <Link
          href="/workouts"
          prefetch
          className={cn(
            "bg-black/30 px-4 py-3.5 active:bg-black/45 transition-colors",
            trainingStatus === "active" && "bg-cyan-500/10"
          )}
        >
          <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wide text-cyan-300/90">
            <TrainingIcon className="h-3 w-3" />
            Training
          </div>
          <p className="text-lg font-bold text-white mt-1">{trainingLabel}</p>
        </Link>

        <Link href="/activities" prefetch className="bg-black/30 px-4 py-3.5 active:bg-black/45">
          <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wide text-emerald-300/90">
            <Footprints className="h-3 w-3" />
            Schritte
          </div>
          <p className="text-lg font-bold text-white tabular-nums mt-1">
            {steps > 0 ? steps.toLocaleString("de-DE") : "—"}
          </p>
          <p className="text-[10px] text-zinc-500 tabular-nums">{stepPct}% Ziel</p>
        </Link>

        <Link href="/nutrition" prefetch className="bg-black/30 px-4 py-3.5 active:bg-black/45 col-span-2">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wide text-sky-300/90">
                <Droplets className="h-3 w-3" />
                Wasser
              </div>
              <p className="text-lg font-bold text-white tabular-nums mt-1">
                {(water.consumedMl / 1000).toFixed(1)} L
              </p>
            </div>
            <div className="flex-1 max-w-[8rem]">
              <div className="h-1.5 rounded-full bg-zinc-800 overflow-hidden">
                <div
                  className="h-full rounded-full bg-sky-400 transition-[width] duration-300"
                  style={{ width: `${waterPct}%` }}
                />
              </div>
              <p className="text-[10px] text-zinc-500 text-right mt-1 tabular-nums">{waterPct}%</p>
            </div>
          </div>
        </Link>
      </div>
    </div>
  );
});
