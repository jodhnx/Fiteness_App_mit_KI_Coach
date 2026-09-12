"use client";

import { memo, useCallback, useEffect, useMemo, useState } from "react";
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
import { cn } from "@/lib/utils";

type Props = {
  open: boolean;
  onClose: () => void;
  selectedDay: string;
  onSelectDay: (ymd: string) => void;
};

type CalendarMeta = { month: string; trackedDays: string[] };

function calendarCacheKey(month: string) {
  return `nutrition-calendar:${month}`;
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

  useEffect(() => {
    if (!open) return;
    const [y, m] = selectedDay.split("-").map(Number);
    setYear(y);
    setMonthIndex0(m - 1);
  }, [open, selectedDay]);

  const month = yearMonthKey(year, monthIndex0);

  useEffect(() => {
    if (!open) return;
    const key = calendarCacheKey(month);
    const cached = getCached<CalendarMeta>(key, { allowStale: true });
    if (cached?.trackedDays) {
      setTracked(new Set(cached.trackedDays));
    }
    let cancelled = false;
    void fetch(`/api/nutrition/calendar?month=${encodeURIComponent(month)}`, {
      credentials: "include",
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((data: CalendarMeta | null) => {
        if (cancelled || !data?.trackedDays) return;
        setCached(key, data, 10 * 60_000);
        setTracked(new Set(data.trackedDays));
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [open, month]);

  const grid = useMemo(
    () => buildMonthGrid(year, monthIndex0),
    [year, monthIndex0]
  );

  const shiftMonth = useCallback((delta: number) => {
    setMonthIndex0((m) => {
      let next = m + delta;
      let y = year;
      if (next < 0) {
        next = 11;
        y -= 1;
      } else if (next > 11) {
        next = 0;
        y += 1;
      }
      setYear(y);
      return next;
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
            className="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-zinc-200 bg-white text-zinc-700 dark:border-white/10 dark:bg-white/[0.04] dark:text-zinc-200"
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
            className="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-zinc-200 bg-white text-zinc-700 dark:border-white/10 dark:bg-white/[0.04] dark:text-zinc-200"
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
                onClick={() => {
                  if (isFuture) return;
                  onSelectDay(ymd);
                  onClose();
                }}
                className={cn(
                  "relative flex h-11 flex-col items-center justify-center rounded-xl text-sm font-medium tabular-nums transition-colors",
                  isFuture && "opacity-30 cursor-not-allowed",
                  isSelected &&
                    "bg-accent text-white shadow-sm",
                  !isSelected && !isFuture &&
                    "text-zinc-800 hover:bg-zinc-100 dark:text-zinc-100 dark:hover:bg-white/[0.06]",
                  isToday && !isSelected && "ring-1 ring-accent/50"
                )}
                aria-label={ymd}
                aria-current={isSelected ? "date" : undefined}
              >
                {day}
                {isTracked && !isSelected ? (
                  <span className="absolute bottom-1 h-1 w-1 rounded-full bg-accent" />
                ) : null}
              </button>
            );
          })}
        </div>

        <div className="flex flex-wrap gap-3 text-[11px] text-zinc-500 pt-1">
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full ring-1 ring-accent/50" /> Heute
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-accent" /> Getrackt
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-accent" /> Ausgewählt
          </span>
        </div>

        {!isNutritionTodaySelected(selectedDay, today) ? (
          <button
            type="button"
            className="w-full h-11 rounded-xl border border-zinc-200 bg-white text-sm font-medium text-zinc-800 dark:border-white/10 dark:bg-white/[0.04] dark:text-zinc-100"
            onClick={() => {
              onSelectDay(today);
              onClose();
            }}
          >
            Zurück zu heute
          </button>
        ) : null}
      </div>
    </MobileBottomSheet>
  );
});

function isNutritionTodaySelected(selected: string, today: string) {
  return selected === today;
}
