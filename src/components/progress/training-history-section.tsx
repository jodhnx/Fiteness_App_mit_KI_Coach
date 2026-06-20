"use client";

import { memo, useMemo, useState } from "react";
import Link from "next/link";
import { format } from "date-fns";
import { de } from "date-fns/locale";
import { Dumbbell } from "lucide-react";
import { cn } from "@/lib/utils";

type Session = {
  id: string;
  name: string;
  dayName: string | null;
  completedAt: string | null;
  durationMin: number | null;
  caloriesBurned: number | null;
};

type PeriodFilter = "7d" | "30d" | "90d" | "all";

const PERIODS: { id: PeriodFilter; label: string }[] = [
  { id: "7d", label: "7 Tage" },
  { id: "30d", label: "30 Tage" },
  { id: "90d", label: "90 Tage" },
  { id: "all", label: "Alle" },
];

function inPeriod(iso: string | null, period: PeriodFilter): boolean {
  if (!iso || period === "all") return period === "all" && !!iso;
  const d = new Date(iso);
  const now = Date.now();
  const days = period === "7d" ? 7 : period === "30d" ? 30 : 90;
  return now - d.getTime() <= days * 86_400_000;
}

export const TrainingHistorySection = memo(function TrainingHistorySection({
  sessions,
}: {
  sessions: Session[];
}) {
  const [period, setPeriod] = useState<PeriodFilter>("30d");
  const [muscleFilter, setMuscleFilter] = useState<string>("all");

  const dayNames = useMemo(() => {
    const set = new Set<string>();
    for (const s of sessions) {
      if (s.dayName) set.add(s.dayName);
    }
    return [...set].sort();
  }, [sessions]);

  const filtered = useMemo(
    () =>
      sessions.filter(
        (s) =>
          inPeriod(s.completedAt, period) &&
          (muscleFilter === "all" || s.dayName === muscleFilter)
      ),
    [sessions, period, muscleFilter]
  );

  return (
    <div className="card-premium p-4">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold text-white">📋 Trainingshistorie</h2>
        <Link href="/workouts/journey" className="text-xs text-cyan-400 hover:underline">
          Alle
        </Link>
      </div>

      <div className="flex gap-1 overflow-x-auto scrollbar-hide pb-2 mb-2">
        {PERIODS.map((p) => (
          <button
            key={p.id}
            type="button"
            onClick={() => setPeriod(p.id)}
            className={cn(
              "shrink-0 rounded-full px-3 py-1 text-xs font-medium",
              period === p.id ? "bg-accent text-zinc-950" : "bg-zinc-800 text-zinc-400"
            )}
          >
            {p.label}
          </button>
        ))}
      </div>

      {dayNames.length > 0 && (
        <div className="flex gap-1 overflow-x-auto scrollbar-hide pb-3 mb-1">
          <button
            type="button"
            onClick={() => setMuscleFilter("all")}
            className={cn(
              "shrink-0 rounded-full px-3 py-1 text-xs font-medium",
              muscleFilter === "all" ? "bg-cyan-500/20 text-cyan-300" : "bg-zinc-800 text-zinc-500"
            )}
          >
            Alle Split-Tage
          </button>
          {dayNames.map((name) => (
            <button
              key={name}
              type="button"
              onClick={() => setMuscleFilter(name)}
              className={cn(
                "shrink-0 rounded-full px-3 py-1 text-xs font-medium",
                muscleFilter === name ? "bg-cyan-500/20 text-cyan-300" : "bg-zinc-800 text-zinc-500"
              )}
            >
              {name}
            </button>
          ))}
        </div>
      )}

      {filtered.length === 0 ? (
        <p className="text-sm text-zinc-500 py-4 text-center">Keine Workouts in diesem Zeitraum.</p>
      ) : (
        <ul className="space-y-2 max-h-80 overflow-y-auto">
          {filtered.map((s) => (
            <li
              key={s.id}
              className="flex items-center justify-between rounded-xl bg-zinc-900/60 px-3 py-2.5"
            >
              <div className="min-w-0">
                <p className="text-sm font-medium text-white truncate">{s.name}</p>
                <p className="text-xs text-zinc-500 flex items-center gap-1">
                  {s.dayName && (
                    <>
                      <Dumbbell className="h-3 w-3" />
                      {s.dayName} ·{" "}
                    </>
                  )}
                  {s.completedAt
                    ? format(new Date(s.completedAt), "dd.MM.yyyy", { locale: de })
                    : "—"}
                  {s.durationMin != null ? ` · ${s.durationMin} min` : ""}
                </p>
              </div>
              <Link
                href={`/workouts/journey/${s.id}/edit`}
                className="text-[10px] text-cyan-400 shrink-0 ml-2"
              >
                Details
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
});
