"use client";

import { memo, useMemo } from "react";
import { addDays, format, isSameDay, startOfWeek } from "date-fns";
import { de } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { useCachedFetch } from "@/hooks/use-cached-fetch";

type CalendarPayload = {
  weekStart: string;
  completed: { id: string; name: string; completedAt: string | null }[];
  upcoming: {
    dayId: string;
    dayName: string;
    suggestedDate: string;
  }[];
};

type DayCell = {
  key: string;
  label: string;
  name: string;
  done: boolean;
  isToday: boolean;
  isRest: boolean;
};

function buildWeek(data: CalendarPayload | null | undefined): DayCell[] {
  const now = new Date();
  const weekStart = startOfWeek(now, { weekStartsOn: 1 });
  const completedByDay = new Map<string, string>();
  for (const s of data?.completed ?? []) {
    if (!s.completedAt) continue;
    const key = format(new Date(s.completedAt), "yyyy-MM-dd");
    if (!completedByDay.has(key)) {
      completedByDay.set(key, s.name || "Training");
    }
  }
  const upcomingByDay = new Map(
    (data?.upcoming ?? []).map((u) => [u.suggestedDate, u.dayName] as const)
  );

  return Array.from({ length: 7 }, (_, i) => {
    const date = addDays(weekStart, i);
    const key = format(date, "yyyy-MM-dd");
    const doneName = completedByDay.get(key);
    const planned = upcomingByDay.get(key);
    const isToday = isSameDay(date, now);
    const isRest = !doneName && !planned;
    return {
      key,
      label: format(date, "EEEEEE", { locale: de }),
      name: doneName ?? planned ?? (isRest ? "Erholung" : "Training"),
      done: Boolean(doneName),
      isToday,
      isRest,
    };
  });
}

/** Compact Mo–So week strip — cache-first calendar, no remount spam. */
export const TrainingWeekStrip = memo(function TrainingWeekStrip() {
  const { data } = useCachedFetch<CalendarPayload>(
    "workouts-calendar-week",
    "/api/workouts/calendar",
    180_000,
    8_000,
    { revalidateOnMount: false, staleRatio: 0.9 }
  );

  const days = useMemo(() => buildWeek(data), [data]);

  return (
    <section
      aria-label="Diese Woche"
      className="rounded-2xl border border-zinc-200/90 bg-white p-3 shadow-sm dark:border-white/[0.08] dark:bg-white/[0.02] dark:shadow-none"
    >
      <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-zinc-500 mb-2.5 px-0.5">
        Diese Woche
      </p>
      <div className="grid grid-cols-7 gap-1">
        {days.map((d) => (
          <div
            key={d.key}
            className={cn(
              "flex min-h-[4.25rem] flex-col items-center rounded-xl px-0.5 py-1.5 text-center",
              d.isToday && "bg-accent/10 ring-1 ring-accent/25",
              !d.isToday && d.done && "bg-emerald-50 dark:bg-emerald-500/10",
              !d.isToday && d.isRest && "bg-zinc-50 dark:bg-white/[0.02]"
            )}
          >
            <span
              className={cn(
                "text-[10px] font-semibold uppercase",
                d.isToday ? "text-accent" : "text-zinc-500"
              )}
            >
              {d.label}
            </span>
            <span
              className={cn(
                "mt-1 h-2 w-2 rounded-full",
                d.done
                  ? "bg-emerald-500"
                  : d.isToday
                    ? "bg-accent"
                    : d.isRest
                      ? "bg-zinc-300 dark:bg-zinc-600"
                      : "border-2 border-zinc-300 dark:border-zinc-500"
              )}
              aria-hidden
            />
            <span
              className={cn(
                "mt-1 line-clamp-2 text-[9px] font-medium leading-tight",
                d.done
                  ? "text-emerald-700 dark:text-emerald-400"
                  : "text-zinc-600 dark:text-zinc-400"
              )}
            >
              {d.done ? `${d.name} ✓` : d.name}
            </span>
          </div>
        ))}
      </div>
    </section>
  );
});
