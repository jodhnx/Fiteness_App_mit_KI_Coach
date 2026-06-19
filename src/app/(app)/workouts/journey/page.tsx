"use client";

import Link from "next/link";
import { useCachedFetch } from "@/hooks/use-cached-fetch";
import { WorkoutBackLink } from "@/components/workout/workout-back-link";
import { GymCheckInPanel } from "@/components/workouts/gym-checkin-panel";
import { cn } from "@/lib/utils";
import { Clock, Dumbbell, Flame, Layers, Map, TrendingUp } from "lucide-react";
import { format } from "date-fns";
import { de } from "date-fns/locale";
import type { WorkoutJourney } from "@/lib/workout-journey";

function StatTile({
  icon: Icon,
  label,
  value,
  accent,
}: {
  icon: typeof Flame;
  label: string;
  value: string;
  accent?: string;
}) {
  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-3">
      <Icon className={cn("h-4 w-4 mb-1", accent ?? "text-zinc-500")} />
      <p className="text-lg font-bold text-white tabular-nums">{value}</p>
      <p className="text-[10px] text-zinc-500 uppercase tracking-wide">{label}</p>
    </div>
  );
}

export default function FitnessJourneyPage() {
  const { data, loading } = useCachedFetch<{ journey: WorkoutJourney }>(
    "workouts-journey-full",
    "/api/workouts/journey",
    90_000,
    8000,
    { revalidateOnMount: true, staleRatio: 0.9 }
  );

  const journey = data?.journey;

  if (loading && !journey) {
    return (
      <div className="space-y-4 max-w-lg mx-auto pb-24 animate-pulse">
        <div className="h-6 w-32 bg-zinc-800 rounded" />
        <div className="grid grid-cols-2 gap-2">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-20 bg-zinc-800 rounded-2xl" />
          ))}
        </div>
        <div className="h-48 bg-zinc-800 rounded-2xl" />
      </div>
    );
  }

  if (!journey) {
    return (
      <div className="max-w-lg mx-auto pb-24">
        <WorkoutBackLink />
        <p className="text-zinc-500">Daten konnten nicht geladen werden.</p>
      </div>
    );
  }

  const { streak, checkIn, recentSessions, stats30d } = journey;

  return (
    <div className="space-y-5 max-w-lg mx-auto pb-24">
      <WorkoutBackLink />
      <div>
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <Map className="h-7 w-7 text-emerald-400" />
          Fitness Journey
        </h1>
        <p className="text-sm text-zinc-400 mt-1">Dein Training auf einen Blick</p>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <StatTile
          icon={Flame}
          label="Streak"
          value={`${streak.currentDays} Tage`}
          accent="text-orange-400"
        />
        <StatTile
          icon={TrendingUp}
          label="Längster Streak"
          value={`${streak.longestDays} Tage`}
        />
        <StatTile
          icon={Clock}
          label="Dauer (30T)"
          value={`${stats30d.totalDurationMin} min`}
        />
        <StatTile
          icon={Layers}
          label="Volumen (30T)"
          value={`${stats30d.totalVolumeKg.toLocaleString("de-DE")} kg`}
        />
      </div>

      <GymCheckInPanel stats={checkIn} />

      <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500 mb-3">
          Letzte Trainings
        </p>
        <div className="space-y-2">
          {recentSessions.length === 0 && (
            <p className="text-sm text-zinc-500 py-4 text-center">Noch keine abgeschlossenen Workouts</p>
          )}
          {recentSessions.map((s) => (
            <Link
              key={s.id}
              href={`/workouts/summary/${s.id}`}
              className="flex items-center justify-between rounded-xl bg-zinc-950/50 px-3 py-3 hover:bg-zinc-800/50 transition-colors"
            >
              <div className="min-w-0">
                <p className="font-medium text-white truncate">{s.name}</p>
                <p className="text-xs text-zinc-500">
                  {format(new Date(s.completedAt), "dd.MM.yyyy", { locale: de })} · {s.durationMin} min ·{" "}
                  {s.volumeKg.toLocaleString("de-DE")} kg
                </p>
              </div>
              <div className="text-right shrink-0 ml-2">
                <Dumbbell className="h-4 w-4 text-zinc-600 ml-auto" />
                <p className="text-[10px] text-zinc-500 mt-0.5">{s.exerciseCount} Üb.</p>
              </div>
            </Link>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 text-center">
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 py-4">
          <p className="text-2xl font-bold text-white tabular-nums">{stats30d.sessions}</p>
          <p className="text-xs text-zinc-500 mt-1">Sessions (30T)</p>
        </div>
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 py-4">
          <p className="text-2xl font-bold text-white tabular-nums">{stats30d.gymVisits}</p>
          <p className="text-xs text-zinc-500 mt-1">Gym-Besuche (Monat)</p>
        </div>
      </div>
    </div>
  );
}
