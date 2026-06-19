"use client";

import { useCachedFetch } from "@/hooks/use-cached-fetch";
import { WorkoutBackLink } from "@/components/workout/workout-back-link";
import { Trophy, Weight, Repeat, Layers } from "lucide-react";
import { format } from "date-fns";
import { de } from "date-fns/locale";
import type { KeyLiftRecord, RecordHighlights } from "@/lib/record-highlights";
import type { PrExerciseCard } from "@/lib/pr-center";

function HighlightCard({
  icon: Icon,
  title,
  value,
  sub,
}: {
  icon: typeof Weight;
  title: string;
  value: string;
  sub?: string;
}) {
  return (
    <div className="rounded-2xl border border-zinc-800 bg-gradient-to-br from-zinc-900/80 to-zinc-900/40 p-4">
      <Icon className="h-5 w-5 text-cyan-400 mb-2" />
      <p className="text-[10px] uppercase tracking-wide text-zinc-500">{title}</p>
      <p className="text-xl font-bold text-white mt-1 tabular-nums">{value}</p>
      {sub && <p className="text-xs text-zinc-400 mt-1 truncate">{sub}</p>}
    </div>
  );
}

function KeyLiftCard({ lift }: { lift: KeyLiftRecord }) {
  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-4">
      <p className="text-sm font-semibold text-zinc-400">{lift.label}</p>
      <p className="text-3xl font-bold text-cyan-400 tabular-nums mt-1">
        {lift.weightKg != null ? `${lift.weightKg} kg` : "—"}
      </p>
      {lift.reps != null && lift.reps > 0 && (
        <p className="text-xs text-zinc-500 mt-0.5">{lift.reps} Wdh</p>
      )}
      {lift.exerciseName && (
        <p className="text-xs text-zinc-500 mt-2 truncate">{lift.exerciseName}</p>
      )}
      {lift.achievedAt && (
        <p className="text-[10px] text-zinc-600 mt-1">
          {format(new Date(lift.achievedAt), "dd.MM.yyyy", { locale: de })}
        </p>
      )}
    </div>
  );
}

export default function RecordsPage() {
  const { data, loading } = useCachedFetch<{
    keyLifts: KeyLiftRecord[];
    highlights: RecordHighlights;
    prCenter: PrExerciseCard[];
  }>("workouts-records-v2", "/api/workouts/prs", 90_000, 8000, {
    revalidateOnMount: true,
    staleRatio: 0.9,
  });

  const keyLifts = data?.keyLifts ?? [];
  const highlights = data?.highlights;
  const more = data?.prCenter ?? [];

  return (
    <div className="space-y-5 max-w-lg mx-auto pb-24">
      <WorkoutBackLink />
      <div>
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <Trophy className="h-7 w-7 text-yellow-400" />
          Rekorde
        </h1>
        <p className="text-sm text-zinc-400 mt-1">Persönliche Bestleistungen</p>
      </div>

      {loading && !data && (
        <div className="grid grid-cols-2 gap-2 animate-pulse">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-28 bg-zinc-800 rounded-2xl" />
          ))}
        </div>
      )}

      <div className="grid grid-cols-2 gap-2">
        {keyLifts.map((lift) => (
          <KeyLiftCard key={lift.id} lift={lift} />
        ))}
      </div>

      {highlights && (
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500 px-1">
            Highlights
          </p>
          <div className="grid gap-2">
            <HighlightCard
              icon={Weight}
              title="Schwerster Satz"
              value={
                highlights.heaviestSet
                  ? `${highlights.heaviestSet.weightKg} kg × ${highlights.heaviestSet.reps}`
                  : "—"
              }
              sub={highlights.heaviestSet?.exerciseName}
            />
            <HighlightCard
              icon={Repeat}
              title="Meiste Wiederholungen"
              value={
                highlights.mostReps
                  ? `${highlights.mostReps.reps} Wdh @ ${highlights.mostReps.weightKg} kg`
                  : "—"
              }
              sub={highlights.mostReps?.exerciseName}
            />
            <HighlightCard
              icon={Layers}
              title="Höchstes Trainingsvolumen"
              value={
                highlights.highestSessionVolume
                  ? `${highlights.highestSessionVolume.volumeKg.toLocaleString("de-DE")} kg`
                  : "—"
              }
              sub={highlights.highestSessionVolume?.sessionName}
            />
          </div>
        </div>
      )}

      {more.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500 px-1">
            Weitere PRs
          </p>
          {more.slice(0, 8).map((r) => (
            <div
              key={r.exerciseId}
              className="flex items-center justify-between rounded-xl border border-zinc-800 bg-zinc-900/40 px-4 py-3"
            >
              <div className="min-w-0">
                <p className="font-medium text-white truncate">{r.name}</p>
                <p className="text-xs text-zinc-500">{r.muscleGroup}</p>
              </div>
              <p className="text-lg font-bold text-cyan-400 tabular-nums shrink-0 ml-2">
                {r.currentKg} kg
              </p>
            </div>
          ))}
        </div>
      )}

      {!loading && keyLifts.every((k) => k.weightKg == null) && more.length === 0 && (
        <p className="text-center text-zinc-500 py-8 text-sm">
          Noch keine Rekorde — absolviere ein Training im Live-Modus!
        </p>
      )}
    </div>
  );
}
