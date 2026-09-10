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
import { Copy, MoreHorizontal, Pencil, Play, Plus, Trash2 } from "lucide-react";
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
  const then = new Date(iso);
  if (Number.isNaN(then.getTime())) return "Noch nicht trainiert";
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  const startOfThen = new Date(then);
  startOfThen.setHours(0, 0, 0, 0);
  const days = Math.round((startOfToday.getTime() - startOfThen.getTime()) / 86_400_000);
  if (days <= 0) return "Today";
  if (days === 1) return "Yesterday";
  return `vor ${days} Tagen`;
}

function PlanRow({
  plan,
  onDelete,
  onArchive,
  onDuplicate,
}: {
  plan: Plan;
  onDelete: (id: string) => void;
  onArchive: (id: string) => void;
  onDuplicate: (id: string) => void;
}) {
  const router = useRouter();
  const [pickerOpen, setPickerOpen] = useState(false);
  const [starting, setStarting] = useState(false);

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
      <li className="rounded-2xl border border-white/[0.08] bg-zinc-900/80 overflow-hidden">
        <div className="px-4 pt-4 pb-2">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <p className="text-base font-semibold text-white truncate">{plan.name}</p>
              <p className="text-sm text-zinc-400 mt-0.5">
                {trainingDayCount} {trainingDayCount === 1 ? "Tag" : "Tage"}/Woche
              </p>
              <p className="text-xs text-zinc-500 mt-1">
                Last workout: {formatLastSession(plan.lastSessionAt)}
              </p>
            </div>
            <details className="relative shrink-0">
              <summary className="list-none [&::-webkit-details-marker]:hidden [&::marker]:hidden h-11 w-11 rounded-xl flex items-center justify-center text-zinc-500 cursor-pointer hover:bg-white/5">
                <MoreHorizontal className="h-4 w-4" />
                <span className="sr-only">Weitere Optionen</span>
              </summary>
              <div className="absolute right-0 z-20 mt-1 w-44 rounded-xl border border-white/[0.08] bg-zinc-900 p-1 shadow-lg">
                <button
                  type="button"
                  className="w-full flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm text-zinc-200 hover:bg-white/5"
                  onClick={() => onDuplicate(plan.id)}
                >
                  <Copy className="h-4 w-4" />
                  Duplizieren
                </button>
                <button
                  type="button"
                  className="w-full flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm text-zinc-200 hover:bg-white/5"
                  onClick={() => onArchive(plan.id)}
                >
                  Archivieren
                </button>
                <button
                  type="button"
                  className="w-full flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm text-red-400 hover:bg-white/5"
                  onClick={confirmDelete}
                >
                  <Trash2 className="h-4 w-4" />
                  Löschen
                </button>
              </div>
            </details>
          </div>
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
                Start
              </>
            )}
          </button>
          <div className="w-px bg-white/[0.05]" />
          <Link
            href={`/workouts/plans/${plan.id}`}
            className="flex-1 flex items-center justify-center gap-2 py-3.5 text-sm font-medium text-zinc-400 hover:text-white hover:bg-zinc-800/50 transition-colors"
          >
            <Pencil className="h-4 w-4" />
            Edit
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

  const { data, loading, reload } = useCachedFetch<{ plans: Plan[] }>(
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

  const archivePlan = useCallback(async (id: string) => {
    setRemovedIds((prev) => new Set(prev).add(id));
    invalidateCache(CACHE_KEYS.PLANS_LIST);
    invalidateCache("workouts-my-plans-hub");
    const res = await fetch(`/api/workouts/plans/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ archive: true }),
    });
    if (!res.ok) {
      setRemovedIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
      toast.error("Plan konnte nicht archiviert werden");
      return;
    }
    toast.success("Plan archiviert");
  }, []);

  const duplicatePlan = useCallback(async (id: string) => {
    const res = await fetch(`/api/workouts/plans/${id}/duplicate`, { method: "POST" });
    if (!res.ok) {
      toast.error("Plan konnte nicht dupliziert werden");
      return;
    }
    invalidateCache(CACHE_KEYS.PLANS_LIST);
    invalidateCache("workouts-my-plans-hub");
    toast.success("Plan dupliziert");
    void reload();
  }, [reload]);

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
            <PlanRow
              key={plan.id}
              plan={plan}
              onDelete={deletePlan}
              onArchive={archivePlan}
              onDuplicate={duplicatePlan}
            />
          ))}
        </ul>
      )}

      {!loading && plans.length === 0 && (
        <div className="rounded-3xl border border-dashed border-zinc-700/60 py-16 text-center space-y-4">
          <div className="mx-auto h-16 w-16 rounded-3xl bg-zinc-800/50 flex items-center justify-center">
            <Plus className="h-7 w-7 text-zinc-500" />
          </div>
          <div>
            <p className="text-sm font-medium text-zinc-400">Noch kein Trainingsplan</p>
            <p className="text-xs text-zinc-600 mt-0.5">Erstelle einen Plan oder starte direkt</p>
          </div>
          <div className="flex flex-col items-center gap-2">
            <Link href="/workouts/create">
              <Button className="rounded-2xl px-6">Plan erstellen</Button>
            </Link>
            <Link href="/workouts/quick">
              <Button variant="secondary" className="rounded-2xl px-6">Quick Workout</Button>
            </Link>
            <Link href="/workouts/generator">
              <Button variant="ghost" className="rounded-2xl px-6">AI Plan Generator</Button>
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
