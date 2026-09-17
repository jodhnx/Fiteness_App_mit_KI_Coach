"use client";

import { memo, useEffect, useState } from "react";
import Link from "next/link";
import { CalendarDays, ChevronRight } from "lucide-react";

type ActiveSummary = {
  id: string;
  name: string;
  durationDays: number;
  currentDayNumber: number;
  totals: { calories: number; proteinG: number };
  targetCalories: number;
  targetProteinG: number;
};

/** Compact card for Nutrition dashboard — planned macros only (not eaten). */
export const NutritionActivePlanCard = memo(function NutritionActivePlanCard() {
  const [active, setActive] = useState<ActiveSummary | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void fetch("/api/nutrition/plans/active", { credentials: "include" })
      .then(async (res) => {
        if (!res.ok) return null;
        return res.json() as Promise<{ active: ActiveSummary | null }>;
      })
      .then((data) => {
        if (!cancelled) {
          setActive(data?.active ?? null);
          setLoaded(true);
        }
      })
      .catch(() => {
        if (!cancelled) setLoaded(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (!loaded) return null;

  if (!active) {
    return (
      <Link
        href="/nutrition/plans"
        className="flex min-h-12 items-center justify-between gap-3 rounded-2xl border border-zinc-200/90 bg-white px-4 py-3 shadow-sm active:bg-zinc-50 dark:border-white/[0.08] dark:bg-white/[0.02] dark:active:bg-white/[0.04]"
      >
        <span className="flex items-center gap-3 min-w-0">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent/10 text-accent">
            <CalendarDays className="h-5 w-5" />
          </span>
          <span className="min-w-0">
            <span className="block text-[14px] font-semibold text-zinc-900 dark:text-white">
              Ernährungsplan erstellen
            </span>
            <span className="block text-[12px] text-zinc-500">
              Plane Mahlzeiten für die nächsten Tage
            </span>
          </span>
        </span>
        <ChevronRight className="h-4 w-4 text-zinc-400 shrink-0" />
      </Link>
    );
  }

  return (
    <Link
      href={`/nutrition/plans/${active.id}`}
      className="block rounded-2xl border border-accent/25 bg-white px-4 py-3.5 shadow-sm active:bg-zinc-50 dark:border-accent/30 dark:bg-white/[0.02] dark:active:bg-white/[0.04]"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-accent">
            Dein Ernährungsplan
          </p>
          <p className="mt-0.5 text-[15px] font-semibold text-zinc-900 dark:text-white truncate">
            {active.name}
          </p>
          <p className="text-[12px] text-zinc-500 mt-0.5">
            Tag {active.currentDayNumber} von {active.durationDays}
          </p>
        </div>
        <ChevronRight className="h-4 w-4 text-zinc-400 shrink-0 mt-1" />
      </div>
      <p className="mt-2 text-[13px] tabular-nums text-zinc-700 dark:text-zinc-300">
        {Math.round(active.totals.calories).toLocaleString("de-DE")}
        {active.targetCalories > 0
          ? ` / ${active.targetCalories.toLocaleString("de-DE")}`
          : ""}{" "}
        kcal geplant
      </p>
      {active.targetProteinG > 0 ? (
        <p className="text-[12px] tabular-nums text-zinc-500">
          {Math.round(active.totals.proteinG)} / {active.targetProteinG} g Protein
          geplant
        </p>
      ) : null}
      <span className="mt-2 inline-flex text-[12px] font-semibold text-accent">
        Plan öffnen
      </span>
    </Link>
  );
});
