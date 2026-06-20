"use client";

import { memo, useCallback, useMemo, useState } from "react";
import { useCachedFetch } from "@/hooks/use-cached-fetch";
import { WorkoutBackLink } from "@/components/workout/workout-back-link";
import { GymCheckInPanel } from "@/components/workouts/gym-checkin-panel";
import { WorkoutCard } from "@/components/workout/workout-card";
import { cn } from "@/lib/utils";
import { Clock, Flame, Layers, Map, TrendingUp } from "lucide-react";
import type { WorkoutJourney } from "@/lib/workout-journey";
import { CACHE_KEYS } from "@/lib/cache-manager";
import { getCachedJourney } from "@/lib/cache-manager";
import { invalidateCache } from "@/lib/client-cache";
import { hasScreenLoaded } from "@/lib/storage-service";
import { toast } from "sonner";

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

const SessionList = memo(function SessionList({
  sessions,
  onDelete,
  deletingId,
}: {
  sessions: WorkoutJourney["recentSessions"];
  onDelete: (id: string) => void;
  deletingId: string | null;
}) {
  if (sessions.length === 0) {
    return (
      <p className="text-sm text-zinc-500 py-6 text-center">Noch keine abgeschlossenen Workouts</p>
    );
  }

  return (
    <ul className="space-y-2">
      {sessions.map((s) => (
        <li key={s.id}>
          <WorkoutCard
            session={s}
            onDelete={onDelete}
            deleting={deletingId === s.id}
          />
        </li>
      ))}
    </ul>
  );
});

/** FitnessJourneyScreen */
export default function FitnessJourneyPage() {
  const hadCache = useMemo(
    () => getCachedJourney<{ journey: WorkoutJourney }>() != null || hasScreenLoaded("journey"),
    []
  );

  const { data, loading, reload } = useCachedFetch<{ journey: WorkoutJourney }>(
    CACHE_KEYS.JOURNEY,
    "/api/workouts/journey",
    90_000,
    8000,
    { revalidateOnMount: false, staleRatio: 0.98 }
  );

  const [deletingId, setDeletingId] = useState<string | null>(null);

  const journey = data?.journey;
  const showSkeleton = loading && !journey && !hadCache;

  const handleDelete = useCallback(
    async (id: string) => {
      setDeletingId(id);
      try {
        const res = await fetch(`/api/workouts/sessions/${id}`, { method: "DELETE" });
        if (!res.ok) {
          toast.error("Löschen fehlgeschlagen");
          return;
        }
        toast.success("Workout gelöscht");
        invalidateCache(CACHE_KEYS.JOURNEY);
        invalidateCache(CACHE_KEYS.PLANS_LIST);
        invalidateCache(CACHE_KEYS.PROGRESS);
        reload();
      } finally {
        setDeletingId(null);
      }
    },
    [reload]
  );

  if (!journey && !showSkeleton) {
    return (
      <div className="max-w-lg mx-auto pb-24">
        <WorkoutBackLink />
        <p className="text-zinc-500">Daten konnten nicht geladen werden.</p>
      </div>
    );
  }

  const { streak, checkIn, recentSessions, stats30d } = journey ?? {
    streak: { currentDays: 0, longestDays: 0 },
    checkIn: null,
    recentSessions: [],
    stats30d: { sessions: 0, totalDurationMin: 0, totalVolumeKg: 0, gymVisits: 0 },
  };

  return (
    <div className="space-y-5 max-w-lg mx-auto pb-24">
      <WorkoutBackLink />
      <div>
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <Map className="h-7 w-7 text-emerald-400" />
          Fitness Journey
        </h1>
        <p className="text-sm text-zinc-400 mt-1">Abgeschlossene Trainings · neueste zuerst</p>
      </div>

      {showSkeleton ? (
        <ul className="space-y-2">
          {[1, 2, 3].map((i) => (
            <li key={i} className="h-28 rounded-2xl bg-zinc-900 border border-zinc-800" />
          ))}
        </ul>
      ) : (
        <>
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

          {checkIn && <GymCheckInPanel stats={checkIn} />}

          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500 mb-3">
              Trainingshistorie
            </p>
            <SessionList
              sessions={recentSessions}
              onDelete={handleDelete}
              deletingId={deletingId}
            />
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
        </>
      )}
    </div>
  );
}
