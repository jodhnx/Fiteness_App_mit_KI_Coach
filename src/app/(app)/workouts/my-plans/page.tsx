"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useCachedFetch } from "@/hooks/use-cached-fetch";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { WorkoutBackLink } from "@/components/workout/workout-back-link";
import { Button } from "@/components/ui/button";
import {
  DayStatusIndicator,
  dayStatusRowClass,
} from "@/components/workout/day-status-indicator";
import type { DayStatus } from "@/lib/plan-day-status";
import { CACHE_KEYS, warmTrainingCaches } from "@/lib/cache-manager";
import { getCached, invalidateCache } from "@/lib/client-cache";
import { hasScreenLoaded, markScreenLoaded } from "@/lib/storage-service";
import { startWorkoutAndNavigate } from "@/lib/workout-start";
import {
  PlanDayPickerSheet,
  type PlanDayOption,
} from "@/components/workout/plan-day-picker-sheet";
import { Pencil, Play, Plus, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

type DayStatusRow = { id: string; name: string; status: DayStatus };

type PlanDay = {
  id: string;
  name: string;
  exercises: unknown[];
};

type Plan = {
  id: string;
  name: string;
  days: PlanDay[];
  lastSessionAt?: string | null;
  dayStatuses?: DayStatusRow[];
};

function formatLastSession(iso: string | null | undefined) {
  if (!iso) return "Noch nicht trainiert";
  return new Date(iso).toLocaleDateString("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function PlanRow({
  plan,
  onDelete,
}: {
  plan: Plan;
  onDelete: (id: string) => void;
}) {
  const router = useRouter();
  const [pickerOpen, setPickerOpen] = useState(false);
  const [starting, setStarting] = useState(false);

  const exerciseCount = plan.days.reduce((s, d) => s + d.exercises.length, 0);
  const statuses = (plan.dayStatuses ?? []).filter((d) => d.status !== "rest");
  const trainingDayCount = plan.days.length;

  const trainingDays: PlanDayOption[] = useMemo(
    () =>
      plan.days
        .filter((d) => d.exercises.length > 0)
        .map((d) => ({
          id: d.id,
          name: d.name,
          exerciseCount: d.exercises.length,
        })),
    [plan.days]
  );

  const startDay = useCallback(
    async (day: PlanDayOption) => {
      setStarting(true);
      const result = await startWorkoutAndNavigate(router, {
        action: "start",
        workoutPlanId: plan.id,
        workoutDayId: day.id,
        name: `${plan.name} – ${day.name}`,
      });
      setStarting(false);
      if (result.ok) {
        setPickerOpen(false);
        return;
      }
      toast.error(result.error);
    },
    [plan.id, plan.name, router]
  );

  const onStartClick = useCallback(() => {
    if (trainingDays.length === 0) {
      toast.error("Plan hat keine Trainingstage");
      return;
    }
    if (trainingDays.length === 1) {
      void startDay(trainingDays[0]);
      return;
    }
    setPickerOpen(true);
  }, [trainingDays, startDay]);

  const confirmDelete = () => {
    if (!window.confirm(`Plan „${plan.name}" wirklich löschen?`)) return;
    onDelete(plan.id);
  };

  return (
    <>
      <li className="rounded-3xl border border-white/[0.08] bg-gradient-to-b from-zinc-900/90 to-zinc-950 overflow-hidden">
        {/* Header row */}
        <div className="px-5 pt-5 pb-3">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <p className="text-lg font-bold text-white truncate">{plan.name}</p>
              <div className="flex items-center gap-2 mt-1 flex-wrap">
                <span className="inline-flex items-center gap-1 text-xs text-zinc-400 bg-zinc-800/70 rounded-lg px-2 py-0.5">
                  <span className="text-white font-semibold">{trainingDayCount}</span>
                  {" "}{trainingDayCount === 1 ? "Tag" : "Tage"}
                </span>
                <span className="inline-flex items-center gap-1 text-xs text-zinc-400 bg-zinc-800/70 rounded-lg px-2 py-0.5">
                  <span className="text-white font-semibold">{exerciseCount}</span>
                  {" "}{exerciseCount === 1 ? "Übung" : "Übungen"}
                </span>
              </div>
            </div>
            <Button
              size="icon"
              variant="ghost"
              className="h-8 w-8 rounded-xl text-zinc-500 hover:text-red-400 shrink-0"
              onClick={confirmDelete}
              aria-label="Plan löschen"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>

          <p className="text-[11px] text-zinc-500 mt-1.5">
            Zuletzt: {formatLastSession(plan.lastSessionAt)}
          </p>
        </div>

        {/* Day status badges */}
        {statuses.length > 0 && (
          <div className="flex flex-wrap gap-1.5 px-5 pb-3">
            {statuses.map((d) => (
              <span
                key={d.id}
                className={cn(
                  "inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[10px] font-medium",
                  dayStatusRowClass(d.status)
                )}
              >
                <DayStatusIndicator status={d.status} size="sm" />
                <span className="truncate max-w-[5.5rem]">{d.name}</span>
              </span>
            ))}
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-0 border-t border-white/[0.05]">
          <button
            type="button"
            onClick={onStartClick}
            disabled={starting}
            className={cn(
              "flex-1 flex items-center justify-center gap-2 py-3.5 text-sm font-semibold transition-colors",
              starting
                ? "text-zinc-500 cursor-not-allowed"
                : "text-accent hover:bg-accent/10 active:bg-accent/15"
            )}
          >
            {starting ? (
              <span className="text-zinc-500 text-sm">Startet…</span>
            ) : (
              <>
                <Play className="h-4 w-4 fill-current" />
                Starten
              </>
            )}
          </button>
          <div className="w-px bg-white/[0.05]" />
          <Link
            href={`/workouts/plans/${plan.id}`}
            className="flex-1 flex items-center justify-center gap-2 py-3.5 text-sm font-medium text-zinc-400 hover:text-white hover:bg-zinc-800/50 transition-colors"
          >
            <Pencil className="h-4 w-4" />
            Bearbeiten
          </Link>
        </div>
      </li>

      <PlanDayPickerSheet
        open={pickerOpen}
        onClose={() => !starting && setPickerOpen(false)}
        planName={plan.name}
        days={trainingDays}
        onSelectDay={(day) => void startDay(day)}
        starting={starting}
      />
    </>
  );
}

/** MyPlansScreen */
export default function MyPlansPage() {
  const hadCache = useMemo(
    () => getCached(CACHE_KEYS.PLANS_LIST) != null || hasScreenLoaded("my-plans"),
    []
  );
  const [removedIds, setRemovedIds] = useState<Set<string>>(new Set());

  const { data, loading } = useCachedFetch<{ plans: Plan[] }>(
    CACHE_KEYS.PLANS_LIST,
    "/api/workouts/plans",
    120_000,
    8000,
    { revalidateOnMount: false, staleRatio: 0.98 }
  );

  useEffect(() => {
    warmTrainingCaches();
  }, []);

  useEffect(() => {
    if (data?.plans) markScreenLoaded("my-plans");
  }, [data]);

  const deletePlan = useCallback(async (id: string) => {
    setRemovedIds((prev) => new Set(prev).add(id));
    invalidateCache(CACHE_KEYS.PLANS_LIST);
    invalidateCache("workouts-my-plans-hub");

    const res = await fetch(`/api/workouts/plans/${id}`, { method: "DELETE" });
    if (!res.ok) {
      setRemovedIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
      toast.error("Plan konnte nicht gelöscht werden");
    }
  }, []);

  const plans = (data?.plans ?? []).filter((p) => !removedIds.has(p.id));
  const showSkeleton = loading && !data && !hadCache;

  return (
    <div className="space-y-4 pb-28 max-w-lg mx-auto">
      <WorkoutBackLink />

      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white">Meine Pläne</h1>
          <p className="text-xs text-zinc-500 mt-0.5">
            {plans.length} {plans.length === 1 ? "Plan" : "Pläne"}
          </p>
        </div>
        <Link href="/workouts/create">
          <Button size="sm" className="rounded-2xl h-9 px-4">
            <Plus className="h-4 w-4 mr-1.5" />
            Neuer Plan
          </Button>
        </Link>
      </div>

      {showSkeleton && (
        <ul className="space-y-3">
          {[1, 2, 3].map((i) => (
            <li
              key={i}
              className="h-32 rounded-3xl bg-zinc-900/60 border border-zinc-800 animate-pulse"
            />
          ))}
        </ul>
      )}

      {!showSkeleton && (
        <ul className="space-y-3">
          {plans.map((plan) => (
            <PlanRow key={plan.id} plan={plan} onDelete={deletePlan} />
          ))}
        </ul>
      )}

      {!loading && plans.length === 0 && (
        <div className="rounded-3xl border border-dashed border-zinc-700/60 py-16 text-center space-y-4">
          <div className="mx-auto h-16 w-16 rounded-3xl bg-zinc-800/50 flex items-center justify-center">
            <Plus className="h-7 w-7 text-zinc-500" />
          </div>
          <div>
            <p className="text-sm font-medium text-zinc-400">Noch keine Trainingspläne</p>
            <p className="text-xs text-zinc-600 mt-0.5">Erstelle deinen ersten Plan</p>
          </div>
          <Link href="/workouts/create">
            <Button className="rounded-2xl px-6">Plan erstellen</Button>
          </Link>
        </div>
      )}
    </div>
  );
}
