"use client";

import { memo } from "react";
import Link from "next/link";
import { Dumbbell, Footprints, Droplets, Utensils } from "lucide-react";
import { cn } from "@/lib/utils";

type Props = {
  trainingLabel: string;
  trainingHref: string;
  /** Short nutrition status — not a second calorie hero (Today card owns that). */
  nutritionLabel: string;
  nutritionHref?: string;
  steps: number;
  stepGoal: number;
  waterMl: number;
  waterTargetMl: number;
};

const CARD =
  "rounded-[1rem] border border-zinc-200/90 bg-white px-3 py-2.5 shadow-sm min-h-[4.25rem] dark:border-white/[0.07] dark:bg-[#1a1a21] dark:shadow-none";

/** Compact today strip: Training · Nutrition · Steps · Water. */
export const HomeQuickStats = memo(function HomeQuickStats({
  trainingLabel,
  trainingHref,
  nutritionLabel,
  nutritionHref = "/nutrition",
  steps,
  stepGoal,
  waterMl,
  waterTargetMl,
}: Props) {
  const waterL = (waterMl / 1000).toFixed(1).replace(".", ",");
  const waterTargetL = (waterTargetMl / 1000).toFixed(1).replace(".", ",");

  return (
    <section aria-label="Heute auf einen Blick" className="grid grid-cols-2 gap-2">
      <Link
        href={trainingHref}
        prefetch
        scroll={false}
        className={cn(CARD, "active:bg-zinc-50 dark:active:bg-white/[0.04]")}
      >
        <p className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide text-zinc-500">
          <Dumbbell className="h-3.5 w-3.5 text-[var(--training-accent,#6d5dfe)]" aria-hidden />
          Training
        </p>
        <p className="mt-1.5 text-[13px] font-semibold leading-snug text-zinc-900 dark:text-white line-clamp-2">
          {trainingLabel}
        </p>
      </Link>

      <Link
        href={nutritionHref}
        prefetch
        scroll={false}
        className={cn(CARD, "active:bg-zinc-50 dark:active:bg-white/[0.04]")}
      >
        <p className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide text-zinc-500">
          <Utensils className="h-3.5 w-3.5 text-orange-500" aria-hidden />
          Ernährung
        </p>
        <p className="mt-1.5 text-[13px] font-semibold tabular-nums text-zinc-900 dark:text-white line-clamp-2">
          {nutritionLabel}
        </p>
      </Link>

      <div className={CARD}>
        <p className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide text-zinc-500">
          <Footprints className="h-3.5 w-3.5 text-emerald-500" aria-hidden />
          Schritte
        </p>
        <p className="mt-1.5 text-[13px] font-semibold tabular-nums text-zinc-900 dark:text-white">
          {steps.toLocaleString("de-DE")}
          <span className="text-[11px] font-medium text-zinc-500">
            {" "}
            / {stepGoal.toLocaleString("de-DE")}
          </span>
        </p>
      </div>

      <div className={CARD}>
        <p className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide text-zinc-500">
          <Droplets className="h-3.5 w-3.5 text-teal-400" aria-hidden />
          Wasser
        </p>
        <p className="mt-1.5 text-[13px] font-semibold tabular-nums text-zinc-900 dark:text-white">
          {waterL}
          <span className="text-[11px] font-medium text-zinc-500">
            {" "}
            / {waterTargetL} L
          </span>
        </p>
      </div>
    </section>
  );
});
