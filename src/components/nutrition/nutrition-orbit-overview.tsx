"use client";

import { memo, useEffect, useState } from "react";
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

function useRingSize() {
  const [size, setSize] = useState(176);
  useEffect(() => {
    const update = () => {
      const w = window.innerWidth;
      if (w >= 1440) setSize(212);
      else if (w >= 1024) setSize(200);
      else if (w >= 430) setSize(184);
      else if (w >= 390) setSize(176);
      else setSize(168);
    };
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);
  return size;
}

/** One remaining-kcal ring + compact macros. Only remaining surface on Nutrition. */
export const NutritionOrbitOverview = memo(function NutritionOrbitOverview({
  dashboard,
  loading = false,
}: Props) {
  const ringSize = useRingSize();
  const state = resolveNutritionDisplayState(dashboard, { loading });

  if (state.kind === "loading") {
    return (
      <div className="px-1 py-1 space-y-3">
        <div
          className="mx-auto rounded-full bg-white/5 animate-pulse"
          style={{ width: ringSize, height: ringSize }}
        />
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
      <div className="rounded-2xl border border-white/[0.08] bg-zinc-900/30 px-4 py-5 space-y-3 text-center sm:text-left">
        <p className="text-base font-semibold text-white">Kalorienziel festlegen</p>
        <p className="text-sm text-zinc-400 leading-relaxed">
          {state.profileIncomplete
            ? "Bitte Gewicht und Ziel vervollständigen."
            : "Lege dein Kalorienziel fest, um zu sehen, wie viele kcal noch übrig sind."}
        </p>
        <Link
          href="/settings"
          prefetch
          className="inline-flex min-h-11 items-center justify-center rounded-xl bg-white text-zinc-950 px-4 text-sm font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60"
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
    {
      key: "p",
      label: "Protein",
      consumed: consumed.proteinG ?? 0,
      target: targets.proteinG ?? 0,
      bar: "bg-[var(--nutrition-protein)]",
      soft: "text-[var(--nutrition-protein)]",
    },
    {
      key: "c",
      label: "Carbs",
      consumed: consumed.carbsG ?? 0,
      target: targets.carbsG ?? 0,
      bar: "bg-[var(--nutrition-carbs)]",
      soft: "text-[var(--nutrition-carbs)]",
    },
    {
      key: "f",
      label: "Fett",
      consumed: consumed.fatG ?? 0,
      target: targets.fatG ?? 0,
      bar: "bg-[var(--nutrition-fat)]",
      soft: "text-[var(--nutrition-fat)]",
    },
  ] as const;

  return (
    <section className="px-0.5 pt-0.5 pb-1" aria-label="Tagesübersicht Kalorien">
      <CalorieRing
        consumed={cal.consumed}
        target={cal.target}
        remaining={cal.remaining}
        exerciseBurned={dashboard?.exerciseBurned?.calories ?? 0}
        size={ringSize}
      />
      {/* Context only — never a second remaining number */}
      <p className="mt-2.5 text-center text-[12px] text-zinc-500 tabular-nums leading-snug">
        {cal.isOver
          ? `${cal.overBy.toLocaleString("de-DE")} kcal über dem Ziel`
          : `${cal.consumed.toLocaleString("de-DE")} gegessen von ${cal.target.toLocaleString("de-DE")} kcal`}
      </p>

      <div className="mt-3.5 grid grid-cols-3 gap-2 sm:gap-3">
        {macros.map((m) => {
          if (m.target <= 0) return null;
          const macro = getMacroDisplay(m.consumed, m.target, m.label);
          const pct =
            m.target > 0
              ? Math.min(100, Math.round((m.consumed / m.target) * 100))
              : 0;
          return (
            <div key={m.key} className="min-w-0 text-center">
              <p
                className={cn(
                  "text-[10px] font-medium uppercase tracking-wider",
                  m.soft
                )}
              >
                {m.label}
              </p>
              <p
                className={cn(
                  "text-[13px] font-semibold tabular-nums leading-tight mt-0.5",
                  macro.isOver ? "text-red-300" : "text-white"
                )}
              >
                {macro.consumedG}
                <span className="text-zinc-500 font-medium">
                  {" "}
                  / {macro.targetG} g
                </span>
              </p>
              <div className="mt-1.5 mx-auto h-1 w-full max-w-[4.25rem] rounded-full bg-zinc-800/90 overflow-hidden">
                <div
                  className={cn(
                    "h-full rounded-full transition-[width] duration-300",
                    macro.isOver ? "bg-red-400" : m.bar
                  )}
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
