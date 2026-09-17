"use client";

import { memo, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { CalendarDays, ChevronRight } from "lucide-react";
import type { ActivePlanSummaryDto } from "@/lib/nutrition-plan-types";
import {
  ACTIVE_NUTRITION_PLAN_EVENT,
  NUTRITION_ACTIVE_PLAN_KEY,
  readActivePlanCache,
  writeActivePlanCache,
  type ActivePlanCacheEntry,
} from "@/lib/nutrition-plan-cache";
import { isCacheStale } from "@/lib/client-cache";

/**
 * Compact card for Nutrition dashboard — planned macros only (not eaten).
 * Cache-first from bootstrap; background refresh when stale.
 */
export const NutritionActivePlanCard = memo(function NutritionActivePlanCard() {
  const initial = readActivePlanCache();
  const [active, setActive] = useState<ActivePlanSummaryDto | null>(
    () => initial?.active ?? null
  );
  // Known from cache (including explicit null) → paint immediately
  const [known, setKnown] = useState(() => initial != null);

  const applyEntry = useCallback((entry: ActivePlanCacheEntry) => {
    setActive(entry.active);
    setKnown(true);
  }, []);

  useEffect(() => {
    const onEvent = (e: Event) => {
      const detail = (e as CustomEvent<ActivePlanCacheEntry>).detail;
      if (detail && "active" in detail) applyEntry(detail);
    };
    window.addEventListener(ACTIVE_NUTRITION_PLAN_EVENT, onEvent);
    return () => window.removeEventListener(ACTIVE_NUTRITION_PLAN_EVENT, onEvent);
  }, [applyEntry]);

  useEffect(() => {
    let cancelled = false;
    const needFetch = !known || isCacheStale(NUTRITION_ACTIVE_PLAN_KEY, 0.85);
    if (!needFetch) return;

    void fetch("/api/nutrition/plans/active", { credentials: "include" })
      .then(async (res) => {
        if (!res.ok) return null;
        return res.json() as Promise<{ active: ActivePlanSummaryDto | null }>;
      })
      .then((data) => {
        if (cancelled) return;
        const next = data?.active ?? null;
        writeActivePlanCache(next);
        setActive(next);
        setKnown(true);
      })
      .catch(() => {
        if (!cancelled) setKnown(true);
      });
    return () => {
      cancelled = true;
    };
  }, [known]);

  // Until first knowledge: show create CTA shell (never blank / delayed pop-in)
  if (!known) {
    return (
      <Link
        href="/nutrition/plans"
        className="flex min-h-12 items-center justify-between gap-3 rounded-2xl border border-zinc-200/90 bg-white px-4 py-3 shadow-sm active:bg-zinc-50 dark:border-white/[0.08] dark:bg-white/[0.02] dark:active:bg-white/[0.04]"
        aria-label="Ernährungsplan erstellen"
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

  if (!active) {
    return (
      <Link
        href="/nutrition/plans"
        className="flex min-h-12 items-center justify-between gap-3 rounded-2xl border border-zinc-200/90 bg-white px-4 py-3 shadow-sm active:bg-zinc-50 dark:border-white/[0.08] dark:bg-white/[0.02] dark:active:bg-white/[0.04]"
        aria-label="Ernährungsplan erstellen"
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
      aria-label={`Ernährungsplan ${active.name} öffnen`}
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
