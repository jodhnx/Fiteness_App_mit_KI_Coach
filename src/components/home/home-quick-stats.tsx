"use client";

import { memo } from "react";
import Link from "next/link";
import { Dumbbell, Flame, Footprints, Droplets } from "lucide-react";
import { cn } from "@/lib/utils";

type Props = {
  trainingLabel: string;
  trainingHref: string;
  caloriesLabel: string;
  caloriesHref?: string;
  steps: number;
  stepGoal: number;
  waterMl: number;
  waterTargetMl: number;
};

const CARD =
  "rounded-2xl border border-zinc-200/90 bg-white px-3 py-2.5 shadow-sm min-h-[4.5rem] dark:border-white/[0.08] dark:bg-white/[0.03] dark:shadow-none";

/** Compact 4-up day stats — real data only, no placeholders as facts. */
export const HomeQuickStats = memo(function HomeQuickStats({
  trainingLabel,
  trainingHref,
  caloriesLabel,
  caloriesHref = "/nutrition",
  steps,
  stepGoal,
  waterMl,
  waterTargetMl,
}: Props) {
  const waterL = (waterMl / 1000).toFixed(1).replace(".", ",");
  const waterTargetL = (waterTargetMl / 1000).toFixed(1).replace(".", ",");

  return (
    <section aria-label="Heute auf einen Blick" className="grid grid-cols-2 gap-2 sm:grid-cols-4">
      <Link href={trainingHref} prefetch scroll={false} className={cn(CARD, "active:bg-zinc-50 dark:active:bg-white/[0.05]")}>
        <p className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide text-zinc-500">
          <Dumbbell className="h-3.5 w-3.5 text-violet-500" aria-hidden />
          Training
        </p>
        <p className="mt-1.5 text-[13px] font-semibold leading-snug text-zinc-900 dark:text-zinc-100 line-clamp-2">
          {trainingLabel}
        </p>
      </Link>

      <Link href={caloriesHref} prefetch scroll={false} className={cn(CARD, "active:bg-zinc-50 dark:active:bg-white/[0.05]")}>
        <p className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide text-zinc-500">
          <Flame className="h-3.5 w-3.5 text-amber-500" aria-hidden />
          Ernährung
        </p>
        <p className="mt-1.5 text-[13px] font-semibold tabular-nums text-zinc-900 dark:text-zinc-100">
          {caloriesLabel}
        </p>
      </Link>

      <div className={CARD}>
        <p className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide text-zinc-500">
          <Footprints className="h-3.5 w-3.5 text-emerald-500" aria-hidden />
          Schritte
        </p>
        <p className="mt-1.5 text-[13px] font-semibold tabular-nums text-zinc-900 dark:text-zinc-100">
          {steps.toLocaleString("de-DE")}
          <span className="text-[11px] font-medium text-zinc-500">
            {" "}
            / {stepGoal.toLocaleString("de-DE")}
          </span>
        </p>
      </div>

      <div className={CARD}>
        <p className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide text-zinc-500">
          <Droplets className="h-3.5 w-3.5 text-sky-500" aria-hidden />
          Wasser
        </p>
        <p className="mt-1.5 text-[13px] font-semibold tabular-nums text-zinc-900 dark:text-zinc-100">
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
