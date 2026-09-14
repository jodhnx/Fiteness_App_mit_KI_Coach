"use client";

import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { MobileBottomSheet } from "@/components/ui/mobile-bottom-sheet";
import { getCached, setCached } from "@/lib/client-cache";
import { nutritionDayKey } from "@/lib/nutrition-day";
import {
  WEEKDAY_LABELS_DE,
  MONTH_LABELS_DE,
  buildMonthGrid,
  yearMonthKey,
  ymdFromParts,
} from "@/lib/nutrition-calendar";
import { nutritionDashboardCacheKeyForDay } from "@/lib/nutrition-calendar";
import { nutritionDayQueryForYmd } from "@/lib/nutrition-calendar";
import { cn } from "@/lib/utils";
import type { NutritionDashboardPayload } from "@/lib/nutrition-defaults";

type Props = {
  open: boolean;
  onClose: () => void;
  selectedDay: string;
  onSelectDay: (ymd: string) => void;
};

type CalendarMeta = { month: string; trackedDays: string[] };

const MONTH_TTL_MS = 30 * 60_000;

function calendarCacheKey(month: string) {
  return `nutrition-calendar:${month}`;
}

function shiftYearMonth(year: number, monthIndex0: number, delta: number) {
  let m = monthIndex0 + delta;
  let y = year;
  while (m < 0) {
    m += 12;
    y -= 1;
  }
  while (m > 11) {
    m -= 12;
    y += 1;
  }
  return { year: y, monthIndex0: m, month: yearMonthKey(y, m) };
}

async function fetchMonthMeta(month: string): Promise<CalendarMeta | null> {
  const res = await fetch(
    `/api/nutrition/calendar?month=${encodeURIComponent(month)}`,
    { credentials: "include" }
  );
  if (!res.ok) return null;
  return (await res.json()) as CalendarMeta;
}

function warmDayDashboard(ymd: string) {
  const key = nutritionDashboardCacheKeyForDay(ymd);
  if (getCached<NutritionDashboardPayload>(key, { allowStale: true })) return;
  void fetch(`/api/nutrition/dashboard?${nutritionDayQueryForYmd(ymd)}`, {
    credentials: "include",
  })
    .then((r) => (r.ok ? r.json() : null))
    .then((data: NutritionDashboardPayload | null) => {
      if (!data?.mealsByType) return;
      setCached(key, data, 10 * 60_000);
    })
    .catch(() => {});
}

export const NutritionDayCalendar = memo(function NutritionDayCalendar({
  open,
  onClose,
  selectedDay,
  onSelectDay,
}: Props) {
  const today = nutritionDayKey();
  const initial = useMemo(() => {
    const [y, m] = selectedDay.split("-").map(Number);
    return { year: y, monthIndex0: m - 1 };
  }, [selectedDay]);

  const [year, setYear] = useState(initial.year);
  const [monthIndex0, setMonthIndex0] = useState(initial.monthIndex0);
  const [tracked, setTracked] = useState<Set<string>>(() => new Set());
  const warmedMonths = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!open) return;
    const [y, m] = selectedDay.split("-").map(Number);
    setYear(y);
    setMonthIndex0(m - 1);
  }, [open, selectedDay]);

  const month = yearMonthKey(year, monthIndex0);

  const applyMeta = useCallback((data: CalendarMeta | null) => {
    if (!data?.trackedDays) return;
    setCached(calendarCacheKey(data.month), data, MONTH_TTL_MS);
    if (data.month === yearMonthKey(year, monthIndex0)) {
      setTracked(new Set(data.trackedDays));
    }
  }, [year, monthIndex0]);

  useEffect(() => {
    if (!open) return;
    const key = calendarCacheKey(month);
    const cached = getCached<CalendarMeta>(key, { allowStale: true });
    if (cached?.trackedDays) {
      setTracked(new Set(cached.trackedDays));
    }

    let cancelled = false;
    void fetchMonthMeta(month).then((data) => {
      if (cancelled || !data) return;
      applyMeta(data);
    });

    // Prefetch adjacent months + warm tracked historical days from cache meta
    for (const delta of [-1, 1]) {
      const adj = shiftYearMonth(year, monthIndex0, delta);
      if (warmedMonths.current.has(adj.month)) continue;
      const adjCached = getCached<CalendarMeta>(calendarCacheKey(adj.month), {
        allowStale: true,
      });
      if (adjCached?.trackedDays) {
        warmedMonths.current.add(adj.month);
        // Soft-warm a few recent tracked days for instant day open
        for (const ymd of adjCached.trackedDays.slice(-5)) {
          if (ymd !== today) warmDayDashboard(ymd);
        }
        continue;
      }
      warmedMonths.current.add(adj.month);
      void fetchMonthMeta(adj.month).then((data) => {
        if (!data?.trackedDays) return;
        setCached(calendarCacheKey(data.month), data, MONTH_TTL_MS);
        for (const ymd of data.trackedDays.slice(-5)) {
          if (ymd !== today) warmDayDashboard(ymd);
        }
      });
    }

    // Warm tracked days of the visible month
    const currentCached = getCached<CalendarMeta>(calendarCacheKey(month), {
      allowStale: true,
    });
    if (currentCached?.trackedDays) {
      for (const ymd of currentCached.trackedDays.slice(-8)) {
        if (ymd !== today) warmDayDashboard(ymd);
      }
    }

    return () => {
      cancelled = true;
    };
  }, [open, month, year, monthIndex0, applyMeta]);

  const grid = useMemo(
    () => buildMonthGrid(year, monthIndex0),
    [year, monthIndex0]
  );

  const shiftMonth = useCallback((delta: number) => {
    setMonthIndex0((m) => {
      const next = shiftYearMonth(year, m, delta);
      setYear(next.year);
      return next.monthIndex0;
    });
  }, [year]);

  const maxDay = today;

  return (
    <MobileBottomSheet
      open={open}
      onClose={onClose}
      title="Ernährungstag"
      subtitle="Vergangene Tage anzeigen"
      variant="compact"
    >
      <div className="space-y-3 px-1 pb-2">
        <div className="flex items-center justify-between gap-2">
          <button
            type="button"
            className="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-zinc-200 bg-white text-zinc-700 shadow-sm dark:border-white/10 dark:bg-white/[0.04] dark:text-zinc-200"
            aria-label="Vorheriger Monat"
            onClick={() => shiftMonth(-1)}
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <p className="text-sm font-semibold text-zinc-900 dark:text-white tabular-nums">
            {MONTH_LABELS_DE[monthIndex0]} {year}
          </p>
          <button
            type="button"
            className="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-zinc-200 bg-white text-zinc-700 shadow-sm dark:border-white/10 dark:bg-white/[0.04] dark:text-zinc-200"
            aria-label="Nächster Monat"
            onClick={() => shiftMonth(1)}
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>

        <div className="grid grid-cols-7 gap-1 text-center">
          {WEEKDAY_LABELS_DE.map((d) => (
            <div
              key={d}
              className="py-1 text-[10px] font-semibold uppercase tracking-wide text-zinc-500"
            >
              {d}
            </div>
          ))}
          {grid.map((day, idx) => {
            if (day == null) {
              return <div key={`pad-${idx}`} className="h-11" />;
            }
            const ymd = ymdFromParts(year, monthIndex0, day);
            const isFuture = ymd > maxDay;
            const isToday = ymd === today;
            const isSelected = ymd === selectedDay;
            const isTracked = tracked.has(ymd);
            return (
              <button
                key={ymd}
                type="button"
                disabled={isFuture}
                onPointerEnter={() => {
                  if (!isFuture && ymd !== today) warmDayDashboard(ymd);
                }}
                onClick={() => {
                  if (isFuture) return;
                  if (ymd !== today) warmDayDashboard(ymd);
                  onSelectDay(ymd);
                  onClose();
                }}
                className={cn(
                  "relative flex h-11 flex-col items-center justify-center rounded-xl text-sm font-semibold tabular-nums transition-colors",
                  isFuture && "cursor-not-allowed text-zinc-300 dark:text-zinc-700",
                  !isFuture &&
                    !isSelected &&
                    "text-zinc-800 hover:bg-zinc-100 dark:text-zinc-100 dark:hover:bg-white/[0.06]",
                  isToday && !isSelected && "ring-1 ring-accent/40",
                  isSelected && "bg-accent text-white shadow-sm"
                )}
              >
                {day}
                {isTracked && !isSelected ? (
                  <span className="absolute bottom-1 h-1 w-1 rounded-full bg-accent" />
                ) : null}
              </button>
            );
          })}
        </div>
      </div>
    </MobileBottomSheet>
  );
});
