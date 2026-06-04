"use client";

import Link from "next/link";
import { useCachedFetch } from "@/hooks/use-cached-fetch";
import { LazyStatChart } from "@/components/charts/lazy-stat-chart";
import { ArrowLeft, Trophy } from "lucide-react";
import { format } from "date-fns";
import { de } from "date-fns/locale";
import type { PrExerciseCard } from "@/lib/pr-center";

export default function RecordsPage() {
  const { data } = useCachedFetch<{
    prCenter: PrExerciseCard[];
  }>("workouts-pr-center", "/api/workouts/prs", 90_000);

  const cards = data?.prCenter ?? [];

  return (
    <div className="space-y-5 max-w-2xl mx-auto pb-28">
      <Link href="/workouts" className="text-cyan-400 text-sm flex items-center gap-1">
        <ArrowLeft className="h-4 w-4" /> Training
      </Link>
      <h1 className="text-2xl font-bold text-white flex items-center gap-2">
        <Trophy className="text-yellow-400 h-7 w-7" /> Personal Records
      </h1>
      <p className="text-sm text-zinc-500">Kraftentwicklung · Rekorde · Verlauf</p>

      <div className="grid gap-4">
        {cards.map((r) => (
          <div key={r.exerciseId} className="card-premium p-4">
            <div className="flex justify-between items-start gap-2">
              <div>
                <p className="text-lg font-bold text-white">{r.name}</p>
                <p className="text-xs text-zinc-500">{r.muscleGroup}</p>
              </div>
              {r.improvementPct != null && r.improvementPct > 0 && (
                <span className="text-sm font-bold text-emerald-400 tabular-nums">
                  +{r.improvementPct}%
                </span>
              )}
            </div>
            <div className="grid grid-cols-3 gap-2 mt-3 text-center">
              <div>
                <p className="text-[10px] text-zinc-500">Start</p>
                <p className="font-semibold text-zinc-400 tabular-nums">
                  {r.startKg ?? "—"} {r.startKg != null && "kg"}
                </p>
              </div>
              <div>
                <p className="text-[10px] text-zinc-500">Aktuell</p>
                <p className="text-xl font-bold text-cyan-400 tabular-nums">{r.currentKg} kg</p>
              </div>
              <div>
                <p className="text-[10px] text-zinc-500">Datum</p>
                <p className="text-xs text-zinc-300">
                  {format(new Date(r.achievedAt), "dd.MM.yy", { locale: de })}
                </p>
              </div>
            </div>
            {r.history.length > 1 && (
              <div className="mt-3">
                <LazyStatChart data={r.history} type="bar" color="#22d3ee" />
              </div>
            )}
          </div>
        ))}
        {cards.length === 0 && (
          <p className="text-zinc-500 text-center py-8">
            Noch keine Rekorde – absolviere ein Training im Live-Modus!
          </p>
        )}
      </div>
    </div>
  );
}
