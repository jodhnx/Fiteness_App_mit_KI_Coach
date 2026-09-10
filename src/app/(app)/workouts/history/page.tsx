"use client";

import { useMemo, useState } from "react";
import { PageShell } from "@/components/layout/page-shell";
import { useCachedFetch } from "@/hooks/use-cached-fetch";
import { cardioDisplayLabel, cardioEmoji } from "@/lib/cardio/cardio-types";
import { format, isToday, parseISO } from "date-fns";
import { de } from "date-fns/locale";
import Link from "next/link";
import { Button } from "@/components/ui/button";

type SessionRow = {
  id: string;
  name: string;
  completedAt?: string | null;
  startedAt: string;
  durationSec?: number | null;
  caloriesBurned?: number | null;
  volumeKg?: number;
  setCount?: number;
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
    hasMore?: boolean;
  }>("workout-history-sessions", "/api/workouts/sessions?limit=20", 90_000, 5_000, {
    revalidateOnMount: false,
    staleRatio: 0.9,
  });

  const { data: actData } = useCachedFetch<{
    activities: ActivityRow[];
  }>("cardio-activities", "/api/activities", 60_000, 4_000, {
    revalidateOnMount: false,
    staleRatio: 0.9,
  });

  const [extraSessions, setExtraSessions] = useState<SessionRow[]>([]);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);

  const firstPage = sessionsData?.sessions ?? [];
  const items = useMemo(() => {
    const strengthSessions = [...firstPage, ...extraSessions];
    const list: HistoryItem[] = [];
    for (const s of strengthSessions) {
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
  }, [firstPage, extraSessions, actData]);

  async function loadMore() {
    if (loadingMore) return;
    setLoadingMore(true);
    try {
      const res = await fetch(
        `/api/workouts/sessions?limit=20&offset=${firstPage.length + extraSessions.length}`
      );
      const data = await res.json();
      const next = (data.sessions ?? []) as SessionRow[];
      setExtraSessions((prev) => [...prev, ...next]);
      setHasMore(Boolean(data.hasMore) && next.length > 0);
    } finally {
      setLoadingMore(false);
    }
  }

  const todayCardioKcal = (actData?.activities ?? [])
    .filter((a) => isToday(new Date(a.startedAt)))
    .reduce((s, a) => s + (a.caloriesBurned ?? 0), 0);

  const showLoadMore =
    hasMore &&
    (sessionsData?.hasMore ?? firstPage.length >= 20);

  return (
    <PageShell title="Trainingshistorie" className="space-y-4 pb-24" bottomNav={false}>
      <div className="flex gap-2">
        <Link
          href="/workouts/cardio"
          className="flex-1 h-10 rounded-xl border border-white/[0.08] bg-zinc-900/60 text-center text-sm font-medium text-zinc-200 leading-10"
        >
          Cardio tracken
        </Link>
        <Link
          href="/workouts/quick"
          className="flex-1 h-10 rounded-xl border border-white/[0.08] bg-zinc-900/60 text-center text-sm font-medium text-zinc-200 leading-10"
        >
          Workout starten
        </Link>
      </div>

      {todayCardioKcal > 0 && (
        <p className="text-sm text-zinc-400 text-center">
          Heute Cardio:{" "}
          <span className="font-semibold tabular-nums text-zinc-200">
            {Math.round(todayCardioKcal)} kcal
          </span>
        </p>
      )}

      {items.length === 0 ? (
        <p className="text-sm text-zinc-500 text-center py-12">
          Noch keine Workouts
        </p>
      ) : (
        <div className="space-y-2">
          {items.map((item) => {
            if (item.kind === "strength") {
              const s = item.data;
              const mins = s.durationSec ? Math.round(s.durationSec / 60) : null;
              const setCount = s.setCount ?? s._count?.sets;
              const volume = s.volumeKg;
              return (
                <Link
                  key={`s-${s.id}`}
                  href={`/workouts/summary/${s.id}`}
                  className="block rounded-2xl border border-white/[0.06] bg-zinc-900/60 px-4 py-3.5"
                >
                  <p className="text-[10px] uppercase tracking-widest text-zinc-500 mb-1">
                    Krafttraining
                  </p>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-white truncate">{s.name}</p>
                    <p className="text-xs text-zinc-500 mt-0.5">
                      {format(parseISO(item.at), "EEE d.M. · HH:mm", { locale: de })}
                      {setCount != null ? ` · ${setCount} Sätze` : ""}
                      {mins != null ? ` · ${mins} min` : ""}
                      {volume != null && volume > 0
                        ? ` · ${volume.toLocaleString("de-DE")} kg`
                        : ""}
                    </p>
                  </div>
                </Link>
              );
            }
            const a = item.data;
            const mins = Math.round(a.durationSec / 60);
            return (
              <div
                key={`c-${a.id}`}
                className="rounded-2xl border border-white/[0.06] bg-zinc-900/60 px-4 py-3.5"
              >
                <p className="text-[10px] uppercase tracking-widest text-zinc-500 mb-1">
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
                  {a.caloriesBurned != null && a.caloriesBurned > 0 ? (
                    <p className="text-sm font-semibold text-zinc-200 tabular-nums">
                      {a.caloriesBurned} kcal
                    </p>
                  ) : (
                    <p className="text-[11px] text-zinc-600 text-right">
                      Kalorien nicht gemessen
                    </p>
                  )}
                </div>
              </div>
            );
          })}
          {showLoadMore && (
            <Button
              type="button"
              variant="secondary"
              className="w-full h-11 rounded-xl"
              disabled={loadingMore}
              onClick={() => void loadMore()}
            >
              {loadingMore ? "Lädt…" : "Mehr laden"}
            </Button>
          )}
        </div>
      )}
    </PageShell>
  );
}
