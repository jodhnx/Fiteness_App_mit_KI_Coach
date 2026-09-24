"use client";

import { memo } from "react";
import Link from "next/link";
import type { NutritionDashboardPayload } from "@/lib/nutrition-defaults";
import { resolveNutritionDisplayState } from "@/lib/nutrition-display";
import { NUTRITION_GOAL_LABELS } from "@/lib/nutrition";
import { PremiumCard } from "@/components/ui/premium-card";
import { cn } from "@/lib/utils";

type Props = {
  nutrition: NutritionDashboardPayload;
  loading?: boolean;
  steps?: number;
  stepGoal?: number;
  trainingHint?: string | null;
};

function modeLabel(nutrition: NutritionDashboardPayload): string {
  const goal = nutrition.targets?.nutritionGoal;
  if (goal && NUTRITION_GOAL_LABELS[goal]) return NUTRITION_GOAL_LABELS[goal];
  return "Heute";
}

/** Central Home calorie card — dense premium layout matching reference. */
export const HomeTodayOverview = memo(function HomeTodayOverview({
  nutrition,
  loading = false,
}: Props) {
  const state = resolveNutritionDisplayState(nutrition, { loading });

  if (state.kind === "loading") {
    return (
      <PremiumCard padding="md" className="space-y-3 min-h-[9rem]">
        <div className="h-3 w-20 rounded bg-zinc-200/80 animate-pulse dark:bg-white/5" />
        <div className="h-9 w-40 rounded bg-zinc-200/80 animate-pulse dark:bg-white/5" />
        <div className="h-2 w-full rounded bg-zinc-200/80 animate-pulse dark:bg-white/5" />
        <div className="grid grid-cols-3 gap-2">
          <div className="h-10 rounded-lg bg-zinc-200/80 animate-pulse dark:bg-white/5" />
          <div className="h-10 rounded-lg bg-zinc-200/80 animate-pulse dark:bg-white/5" />
          <div className="h-10 rounded-lg bg-zinc-200/80 animate-pulse dark:bg-white/5" />
        </div>
      </PremiumCard>
    );
  }

  if (state.kind === "missing_target") {
    return (
      <PremiumCard
        padding="md"
        className="text-center space-y-3 min-h-[9rem] flex flex-col justify-center"
      >
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-zinc-500">
          Heute
        </p>
        <p className="text-base font-semibold text-zinc-900 dark:text-white">
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
      color: "var(--nutrition-protein)",
    },
    {
      label: "Carbs",
      consumed: Math.round(consumed.carbsG ?? 0),
      target: Math.round(targets.carbsG ?? 0),
      color: "var(--nutrition-carbs)",
    },
    {
      label: "Fett",
      consumed: Math.round(consumed.fatG ?? 0),
      target: Math.round(targets.fatG ?? 0),
      color: "var(--nutrition-fat)",
    },
  ].filter((m) => m.target > 0);

  const segParts = macros.map((m) => {
    const ratio = Math.min(1, m.consumed / Math.max(1, m.target));
    return { ...m, ratio };
  });
  const segSum = segParts.reduce((s, p) => s + p.ratio, 0) || 1;

  return (
    <PremiumCard
      padding="md"
      className={cn("space-y-3", cal.isOver && "ring-1 ring-red-500/25")}
    >
      <div className="flex items-center justify-between gap-3">
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-zinc-500">
          {modeLabel(nutrition)}
        </p>
        <Link
          href="/nutrition"
          className="text-[12px] font-semibold text-[var(--ai-accent,#2dd4bf)] hover:opacity-90"
        >
          Ernährung öffnen
        </Link>
      </div>

      <div className="flex items-baseline gap-1.5 flex-wrap">
        <p
          className={cn(
            "text-[2.15rem] font-bold leading-none tabular-nums tracking-tight",
            cal.isOver
              ? "text-red-500 dark:text-red-400"
              : "text-zinc-900 dark:text-white"
          )}
        >
          {Math.round(cal.consumed).toLocaleString("de-DE")}
        </p>
        <p className="text-[15px] font-medium tabular-nums text-zinc-500 dark:text-zinc-400">
          {" / "}
          {Math.round(cal.target).toLocaleString("de-DE")} kcal
        </p>
      </div>

      {segParts.length > 0 ? (
        <div
          className="flex h-2 w-full overflow-hidden rounded-full bg-zinc-200/80 dark:bg-white/[0.06]"
          aria-hidden
        >
          {segParts.map((p) => (
            <div
              key={p.label}
              className="h-full first:rounded-l-full last:rounded-r-full"
              style={{
                width: `${(p.ratio / segSum) * 100}%`,
                background: p.color,
                minWidth: p.ratio > 0 ? 4 : 0,
              }}
            />
          ))}
        </div>
      ) : null}

      {macros.length > 0 ? (
        <div className="grid grid-cols-3 gap-2 pt-0.5">
          {macros.map((m) => (
            <div key={m.label} className="min-w-0">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-zinc-500">
                {m.label}
              </p>
              <p className="mt-0.5 text-[13px] font-bold tabular-nums text-zinc-900 dark:text-white">
                {m.consumed}g
                <span className="text-[11px] font-medium text-zinc-500">
                  {" "}
                  / {m.target}g
                </span>
              </p>
            </div>
          ))}
        </div>
      ) : null}
    </PremiumCard>
  );
});
