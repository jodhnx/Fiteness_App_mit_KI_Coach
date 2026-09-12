"use client";

import { memo } from "react";
import Link from "next/link";
import type { NutritionDashboardPayload } from "@/lib/nutrition-defaults";
import { resolveNutritionDisplayState } from "@/lib/nutrition-display";
import { PremiumCard } from "@/components/ui/premium-card";
import { cn } from "@/lib/utils";

type Props = {
  nutrition: NutritionDashboardPayload;
  loading?: boolean;
  steps?: number;
  stepGoal?: number;
  trainingHint?: string | null;
};

/** Central Home TODAY card — calories + macros only (no duplicate mini-stats). */
export const HomeTodayOverview = memo(function HomeTodayOverview({
  nutrition,
  loading = false,
}: Props) {
  const state = resolveNutritionDisplayState(nutrition, { loading });

  if (state.kind === "loading") {
    return (
      <PremiumCard padding="md" className="space-y-3 min-h-[10rem]">
        <div className="h-3 w-16 rounded bg-zinc-200/80 animate-pulse dark:bg-white/5" />
        <div className="h-12 w-36 rounded bg-zinc-200/80 animate-pulse dark:bg-white/5" />
        <div className="h-4 w-40 rounded bg-zinc-200/80 animate-pulse dark:bg-white/5" />
        <div className="grid grid-cols-3 gap-2">
          <div className="h-14 rounded-xl bg-zinc-200/80 animate-pulse dark:bg-white/5" />
          <div className="h-14 rounded-xl bg-zinc-200/80 animate-pulse dark:bg-white/5" />
          <div className="h-14 rounded-xl bg-zinc-200/80 animate-pulse dark:bg-white/5" />
        </div>
      </PremiumCard>
    );
  }

  if (state.kind === "missing_target") {
    return (
      <PremiumCard
        padding="md"
        className="text-center space-y-3 min-h-[10rem] flex flex-col justify-center"
      >
        <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-zinc-500">
          Today
        </p>
        <p className="text-lg font-semibold text-zinc-900 dark:text-white">
          Kalorienziel festlegen
        </p>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          {state.profileIncomplete
            ? "Vervollständige dein Profil, damit wir dein Tagesziel berechnen können."
            : "Lege dein Kalorienziel fest, um deine verbleibenden kcal zu sehen."}
        </p>
        <Link
          href="/settings"
          className="inline-flex min-h-11 items-center justify-center rounded-xl bg-accent px-5 text-sm font-semibold text-white"
        >
          Ziel festlegen
        </Link>
      </PremiumCard>
    );
  }

  const { cal } = state;
  const consumed = nutrition.consumed ?? {
    calories: 0,
    proteinG: 0,
    carbsG: 0,
    fatG: 0,
  };
  const targets = nutrition.targets ?? {
    calories: 0,
    proteinG: 0,
    carbsG: 0,
    fatG: 0,
  };

  const macros = [
    {
      label: "Protein",
      consumed: Math.round(consumed.proteinG ?? 0),
      target: Math.round(targets.proteinG ?? 0),
    },
    {
      label: "Carbs",
      consumed: Math.round(consumed.carbsG ?? 0),
      target: Math.round(targets.carbsG ?? 0),
    },
    {
      label: "Fat",
      consumed: Math.round(consumed.fatG ?? 0),
      target: Math.round(targets.fatG ?? 0),
    },
  ].filter((m) => m.target > 0);

  return (
    <PremiumCard
      padding="md"
      className={cn("space-y-4", cal.isOver && "ring-1 ring-red-500/25")}
    >
      <div>
        <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-zinc-500">
          Today
        </p>
        <p
          className={cn(
            "mt-2 text-[2.35rem] font-bold leading-none tabular-nums tracking-tight",
            cal.isOver
              ? "text-red-500 dark:text-red-400"
              : "text-zinc-900 dark:text-white"
          )}
        >
          {Math.round(cal.consumed).toLocaleString("de-DE")}
          <span className="ml-1.5 text-base font-semibold text-zinc-400 dark:text-zinc-500">
            / {Math.round(cal.target).toLocaleString("de-DE")} kcal
          </span>
        </p>
        <p
          className={cn(
            "mt-2 text-sm font-semibold tabular-nums",
            cal.isOver
              ? "text-red-500 dark:text-red-400"
              : "text-zinc-600 dark:text-zinc-300"
          )}
        >
          {cal.isOver
            ? `Über Ziel: ${cal.overBy.toLocaleString("de-DE")} kcal`
            : `Remaining: ${cal.remaining.toLocaleString("de-DE")} kcal`}
        </p>
      </div>

      {macros.length > 0 ? (
        <div className="grid grid-cols-3 gap-2">
          {macros.map((m) => (
            <div
              key={m.label}
              className="rounded-xl border border-zinc-100 bg-zinc-50/90 px-2 py-2.5 dark:border-white/[0.06] dark:bg-white/[0.03]"
            >
              <p className="text-[10px] font-semibold uppercase tracking-wide text-zinc-500">
                {m.label}
              </p>
              <p className="mt-1 text-[13px] font-bold tabular-nums text-zinc-900 dark:text-white">
                {m.consumed}
                <span className="text-[11px] font-medium text-zinc-500">
                  {" "}
                  / {m.target} g
                </span>
              </p>
            </div>
          ))}
        </div>
      ) : null}

      <Link
        href="/nutrition"
        className="inline-flex text-[13px] font-semibold text-accent hover:text-accent-hover"
      >
        Ernährung öffnen
      </Link>
    </PremiumCard>
  );
});
