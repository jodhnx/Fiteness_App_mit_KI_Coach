"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useCachedFetch } from "@/hooks/use-cached-fetch";
import { WorkoutBackLink } from "@/components/workout/workout-back-link";
import { Trophy, Weight, Repeat, Layers } from "lucide-react";
import { format } from "date-fns";
import { de } from "date-fns/locale";
import { Input } from "@/components/ui/input";
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
      <Icon className="h-5 w-5 text-zinc-400 mb-2" />
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
      <p className="text-3xl font-semibold text-white tabular-nums mt-1">
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
    records?: {
      recordType: string;
      value: number;
      reps?: number | null;
      weightKg?: number | null;
      exercise: { id: string; name: string; muscleGroup: string };
    }[];
  }>("workouts-records-v2", "/api/workouts/prs", 90_000, 8000, {
    revalidateOnMount: false,
    staleRatio: 0.9,
  });

  const keyLifts = data?.keyLifts ?? [];
  const highlights = data?.highlights;
  const [exerciseQuery, setExerciseQuery] = useState("");
  const exerciseRecords = useMemo(() => {
    const byExercise = new Map<
      string,
      {
        name: string;
        muscleGroup: string;
        types: Record<string, { value: number; reps?: number | null; weightKg?: number | null }>;
      }
    >();
    for (const r of data?.records ?? []) {
      const cur = byExercise.get(r.exercise.id) ?? {
        name: r.exercise.name,
        muscleGroup: r.exercise.muscleGroup,
        types: {},
      };
      cur.types[r.recordType] = { value: r.value, reps: r.reps, weightKg: r.weightKg };
      byExercise.set(r.exercise.id, cur);
    }
    const q = exerciseQuery.trim().toLowerCase();
    const rows = [...byExercise.entries()];
    if (!q) return rows;
    return rows.filter(([, row]) => row.name.toLowerCase().includes(q));
  }, [data?.records, exerciseQuery]);

  return (
    <div className="space-y-5 max-w-lg mx-auto pb-24">
      <WorkoutBackLink />
      <div>
        <h1 className="text-2xl font-semibold text-white flex items-center gap-2">
          <Trophy className="h-7 w-7 text-zinc-300" />
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

      {exerciseRecords.length > 0 || exerciseQuery.trim() ? (
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500 px-1">
            Pro Übung
          </p>
          <Input
            value={exerciseQuery}
            onChange={(e) => setExerciseQuery(e.target.value)}
            placeholder="Exercise auswählen"
            aria-label="Exercise auswählen"
            className="h-12 rounded-2xl bg-zinc-900 border-zinc-800"
          />
          {exerciseRecords.map(([id, row]) => {
            const weight = row.types.MAX_WEIGHT;
            const reps = row.types.MAX_REPS;
            const volume = row.types.MAX_VOLUME;
            const e1 = row.types.ESTIMATED_1RM;
            return (
              <Link
                key={id}
                href={`/workouts/exercises/${id}`}
                className="block rounded-2xl border border-white/[0.08] bg-zinc-900/60 px-4 py-3 space-y-1.5"
              >
                <p className="font-semibold text-white truncate">{row.name}</p>
                <p className="text-[11px] text-zinc-500">{row.muscleGroup}</p>
                <dl className="grid grid-cols-2 gap-x-3 gap-y-1 text-sm tabular-nums">
                  <div>
                    <dt className="text-[10px] uppercase text-zinc-500">Best Weight</dt>
                    <dd className="text-zinc-200">
                      {weight && weight.value > 0 ? `${weight.weightKg ?? weight.value} KG` : "—"}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-[10px] uppercase text-zinc-500">Best Reps</dt>
                    <dd className="text-zinc-200">
                      {reps && reps.value > 0 ? `${reps.reps ?? reps.value}` : "—"}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-[10px] uppercase text-zinc-500">Best Volume</dt>
                    <dd className="text-zinc-200">
                      {volume && volume.value > 0
                        ? `${Math.round(volume.value).toLocaleString("de-DE")} KG`
                        : "—"}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-[10px] uppercase text-zinc-500">Estimated 1RM</dt>
                    <dd className="text-zinc-200">
                      {e1 && e1.value > 0 ? `${e1.value} KG` : "—"}
                    </dd>
                  </div>
                </dl>
              </Link>
            );
          })}
        </div>
      ) : null}

      {!loading && keyLifts.every((k) => k.weightKg == null) && exerciseRecords.length === 0 && (
        <p className="text-center text-zinc-500 py-8 text-sm">
          Noch keine Rekorde — absolviere ein Training im Live-Modus!
        </p>
      )}
    </div>
  );
}
