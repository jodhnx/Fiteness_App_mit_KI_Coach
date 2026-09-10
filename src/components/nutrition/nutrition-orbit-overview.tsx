"use client";

import { memo } from "react";
import Link from "next/link";
import type { NutritionDashboardPayload } from "@/lib/nutrition-defaults";
import {
  getMacroDisplay,
  resolveNutritionDisplayState,
} from "@/lib/nutrition-display";
import { CalorieRing } from "@/components/nutrition/calorie-ring";
import { cn } from "@/lib/utils";

type Props = {
  dashboard: NutritionDashboardPayload | null | undefined;
  loading?: boolean;
};

/** One remaining-kcal ring + macros. Breakfast sits directly below. */
export const NutritionOrbitOverview = memo(function NutritionOrbitOverview({
  dashboard,
  loading = false,
}: Props) {
  const state = resolveNutritionDisplayState(dashboard, { loading });

  if (state.kind === "loading") {
    return (
      <div className="rounded-xl border border-white/[0.08] bg-zinc-900/70 px-3 py-2 space-y-2">
        <div className="mx-auto h-[120px] w-[120px] rounded-full bg-white/5 animate-pulse" />
        <div className="h-3 w-40 mx-auto bg-white/5 rounded animate-pulse" />
        <div className="grid grid-cols-3 gap-2">
          <div className="h-10 bg-white/5 rounded-lg animate-pulse" />
          <div className="h-10 bg-white/5 rounded-lg animate-pulse" />
          <div className="h-10 bg-white/5 rounded-lg animate-pulse" />
        </div>
      </div>
    );
  }

  if (state.kind === "missing_target") {
    return (
      <div className="rounded-xl border border-white/[0.1] bg-zinc-900/70 px-4 py-3 space-y-2">
        <p className="text-lg font-semibold text-white">Kalorienziel festlegen</p>
        <p className="text-sm text-zinc-400">
          {state.profileIncomplete
            ? "Bitte Gewicht und Ziel vervollständigen."
            : "Lege dein Kalorienziel fest, um deine verbleibenden kcal zu sehen."}
        </p>
        <Link
          href="/settings"
          prefetch
          className="inline-flex min-h-11 items-center justify-center rounded-xl bg-white text-zinc-950 px-4 text-sm font-semibold"
        >
          Ziel festlegen
        </Link>
      </div>
    );
  }

  const consumed = dashboard?.consumed ?? {
    calories: 0,
    proteinG: 0,
    carbsG: 0,
    fatG: 0,
  };
  const targets = dashboard?.targets ?? {
    calories: 0,
    proteinG: 0,
    carbsG: 0,
    fatG: 0,
  };
  const { cal } = state;

  const macros = [
    { key: "p", label: "Protein", consumed: consumed.proteinG ?? 0, target: targets.proteinG ?? 0 },
    { key: "c", label: "Carbs", consumed: consumed.carbsG ?? 0, target: targets.carbsG ?? 0 },
    { key: "f", label: "Fat", consumed: consumed.fatG ?? 0, target: targets.fatG ?? 0 },
  ] as const;

  return (
    <section className="rounded-xl border border-white/[0.08] bg-zinc-900/70 px-3 py-2">
      <CalorieRing
        consumed={cal.consumed}
        target={cal.target}
        remaining={cal.remaining}
        exerciseBurned={dashboard?.exerciseBurned?.calories ?? 0}
        size={120}
      />
      <p className="mt-1.5 text-center text-[11px] text-zinc-500 tabular-nums">
        {cal.isOver
          ? `${cal.overBy.toLocaleString("de-DE")} kcal über dem Ziel`
          : `${cal.consumed.toLocaleString("de-DE")} gegessen von ${cal.target.toLocaleString("de-DE")} kcal`}
      </p>

      <div className="mt-2 grid grid-cols-3 gap-2">
        {macros.map((m) => {
          if (m.target <= 0) return null;
          const macro = getMacroDisplay(m.consumed, m.target, m.label);
          const pct =
            m.target > 0 ? Math.min(100, Math.round((m.consumed / m.target) * 100)) : 0;
          return (
            <div key={m.key} className="min-w-0">
              <p className="text-[10px] font-medium text-zinc-500 truncate">{m.label}</p>
              <p
                className={cn(
                  "text-[12px] font-semibold tabular-nums leading-tight mt-0.5",
                  macro.isOver ? "text-red-300" : "text-white"
                )}
              >
                {macro.consumedG} / {macro.targetG} g
              </p>
              <div className="mt-1 h-1 rounded-full bg-zinc-800 overflow-hidden">
                <div
                  className={cn("h-full rounded-full", macro.isOver ? "bg-red-400" : "bg-white/70")}
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
});
