"use client";

import { useMemo } from "react";
import { PageShell } from "@/components/layout/page-shell";
import { useCachedFetch } from "@/hooks/use-cached-fetch";
import { cardioDisplayLabel, cardioEmoji } from "@/lib/cardio/cardio-types";
import { format, isToday, parseISO } from "date-fns";
import { de } from "date-fns/locale";
import Link from "next/link";

type SessionRow = {
  id: string;
  name: string;
  completedAt?: string | null;
  startedAt: string;
  durationSec?: number | null;
  caloriesBurned?: number | null;
  _count?: { sets?: number };
};

type ActivityRow = {
  id: string;
  type: string;
  durationSec: number;
  caloriesBurned: number | null;
  notes: string | null;
  startedAt: string;
};

type HistoryItem =
  | { kind: "strength"; at: string; data: SessionRow }
  | { kind: "cardio"; at: string; data: ActivityRow };

export default function TrainingHistoryPage() {
  const { data: sessionsData } = useCachedFetch<{
    sessions: SessionRow[];
  }>("workout-history-sessions", "/api/workouts/sessions?limit=40", 90_000, 5_000, {
    revalidateOnMount: false,
    staleRatio: 0.9,
  });

  const { data: actData } = useCachedFetch<{
    activities: ActivityRow[];
  }>("cardio-activities", "/api/activities", 60_000, 4_000, {
    revalidateOnMount: false,
    staleRatio: 0.9,
  });

  const items = useMemo(() => {
    const list: HistoryItem[] = [];
    for (const s of sessionsData?.sessions ?? []) {
      if (!s.completedAt) continue;
      list.push({
        kind: "strength",
        at: s.completedAt,
        data: s,
      });
    }
    for (const a of actData?.activities ?? []) {
      list.push({ kind: "cardio", at: a.startedAt, data: a });
    }
    return list.sort(
      (a, b) => new Date(b.at).getTime() - new Date(a.at).getTime()
    );
  }, [sessionsData, actData]);

  const todayCardioKcal = (actData?.activities ?? [])
    .filter((a) => isToday(new Date(a.startedAt)))
    .reduce((s, a) => s + (a.caloriesBurned ?? 0), 0);

  return (
    <PageShell title="Trainingshistorie" className="space-y-4 pb-24" bottomNav={false}>
      <div className="flex gap-2">
        <Link
          href="/workouts/cardio"
          className="flex-1 h-10 rounded-xl border border-orange-500/25 bg-orange-500/10 text-center text-sm font-medium text-orange-200 leading-10"
        >
          Cardio tracken
        </Link>
        <Link
          href="/workouts/quick"
          className="flex-1 h-10 rounded-xl border border-zinc-700 bg-zinc-900/60 text-center text-sm font-medium text-zinc-200 leading-10"
        >
          Workout starten
        </Link>
      </div>

      {todayCardioKcal > 0 && (
        <p className="text-sm text-zinc-400 text-center">
          Heute Cardio:{" "}
          <span className="text-orange-300 font-semibold tabular-nums">
            🔥 {Math.round(todayCardioKcal)} kcal
          </span>
        </p>
      )}

      {items.length === 0 ? (
        <p className="text-sm text-zinc-500 text-center py-12">
          Noch keine Einträge — starte ein Workout oder Cardio.
        </p>
      ) : (
        <div className="space-y-2">
          {items.map((item) => {
            if (item.kind === "strength") {
              const s = item.data;
              const mins = s.durationSec ? Math.round(s.durationSec / 60) : null;
              return (
                <div
                  key={`s-${s.id}`}
                  className="rounded-2xl border border-white/[0.06] bg-zinc-900/60 px-4 py-3.5"
                >
                  <p className="text-[10px] uppercase tracking-widest text-zinc-500 mb-1">
                    Krafttraining
                  </p>
                  <div className="flex items-start gap-3">
                    <span className="text-xl">🏋️</span>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-white truncate">{s.name}</p>
                      <p className="text-xs text-zinc-500 mt-0.5">
                        {format(parseISO(item.at), "EEE d.M. · HH:mm", { locale: de })}
                        {s._count?.sets != null ? ` · ${s._count.sets} Sätze` : ""}
                        {mins != null ? ` · ${mins} min` : ""}
                      </p>
                    </div>
                  </div>
                </div>
              );
            }
            const a = item.data;
            const mins = Math.round(a.durationSec / 60);
            return (
              <div
                key={`c-${a.id}`}
                className="rounded-2xl border border-orange-500/15 bg-orange-500/[0.06] px-4 py-3.5"
              >
                <p className="text-[10px] uppercase tracking-widest text-orange-300/70 mb-1">
                  Cardio
                </p>
                <div className="flex items-start gap-3">
                  <span className="text-xl">
                    {cardioEmoji(a.type as never, a.notes)}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-white truncate">
                      {cardioDisplayLabel(a.type as never, a.notes)}
                    </p>
                    <p className="text-xs text-zinc-500 mt-0.5">
                      {format(parseISO(item.at), "EEE d.M. · HH:mm", { locale: de })} ·{" "}
                      {mins} min
                    </p>
                  </div>
                  <p className="text-sm font-semibold text-orange-300 tabular-nums">
                    {a.caloriesBurned ?? 0} kcal
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </PageShell>
  );
}
