"use client";

import { memo } from "react";
import Link from "next/link";
import { Dumbbell, Plus, Scale, Bot } from "lucide-react";
import { hapticTap } from "@/lib/haptic";
import { mealTypeForHour } from "@/lib/meal-types";
import { cn } from "@/lib/utils";

type TrainingAction = {
  href?: string;
  label?: string;
  onStart?: () => void;
};

type Props = {
  training?: TrainingAction;
};

const chipClass =
  "flex min-h-11 min-w-[4.5rem] shrink-0 flex-col items-center gap-1.5 rounded-2xl border border-white/[0.08] bg-zinc-900/60 px-3 py-2.5 transition-transform active:scale-95";

/** Primary home actions: add food, start/continue training, log weight, open coach. */
export const QuickAccessRail = memo(function QuickAccessRail({ training }: Props) {
  const meal = mealTypeForHour();
  const trainingHref = training?.href ?? "/workouts/quick";
  const trainingLabel = training?.label ?? "Training";

  return (
    <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1 scrollbar-none">
      <Link
        href={`/nutrition?add=${meal}`}
        prefetch
        onClick={() => hapticTap()}
        className={chipClass}
      >
        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent/12">
          <Plus className="h-4 w-4 text-accent" />
        </span>
        <span className="text-[11px] font-semibold text-zinc-200">Essen</span>
      </Link>

      {training?.onStart ? (
        <button
          type="button"
          onClick={() => {
            hapticTap();
            training.onStart?.();
          }}
          className={cn(chipClass, "text-left")}
        >
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent/12">
            <Dumbbell className="h-4 w-4 text-accent" />
          </span>
          <span className="text-[11px] font-semibold text-zinc-200">{trainingLabel}</span>
        </button>
      ) : (
        <Link
          href={trainingHref}
          prefetch
          onClick={() => hapticTap()}
          className={chipClass}
        >
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent/12">
            <Dumbbell className="h-4 w-4 text-accent" />
          </span>
          <span className="text-[11px] font-semibold text-zinc-200">{trainingLabel}</span>
        </Link>
      )}

      <Link
        href="/progress?log=1"
        prefetch
        onClick={() => hapticTap()}
        className={chipClass}
      >
        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent/12">
          <Scale className="h-4 w-4 text-accent" />
        </span>
        <span className="text-[11px] font-semibold text-zinc-200">Gewicht</span>
      </Link>

      <Link
        href="/coach"
        prefetch
        onClick={() => hapticTap()}
        className={chipClass}
      >
        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent/12">
          <Bot className="h-4 w-4 text-accent" />
        </span>
        <span className="text-[11px] font-semibold text-zinc-200">Coach</span>
      </Link>
    </div>
  );
});
