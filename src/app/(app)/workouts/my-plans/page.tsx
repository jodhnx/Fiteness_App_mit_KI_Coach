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
  const exerciseCount = plan.days.reduce((s, d) => s + d.exercises.length, 0);
  const statuses = (plan.dayStatuses ?? []).filter((d) => d.status !== "rest");
  const trainingDayCount = plan.days.length;

  const startPlan = useCallback(async () => {
    const day =
      plan.days.find((d) => d.exercises.length > 0) ?? plan.days[0];
    if (!day) {
      toast.error("Plan hat keine Trainingstage");
      return;
    }
    const result = await startWorkoutAndNavigate(router, {
      action: "start",
      workoutPlanId: plan.id,
      workoutDayId: day.id,
      name: `${plan.name} – ${day.name}`,
    });
    if (!result.ok) toast.error(result.error);
  }, [plan, router]);

  const confirmDelete = () => {
    if (!window.confirm(`Plan „${plan.name}" wirklich löschen?`)) return;
    onDelete(plan.id);
  };

  return (
    <li className="rounded-2xl border border-zinc-800 bg-zinc-900/60 px-4 py-4">
      <div className="min-w-0">
        <p className="text-lg font-bold text-white truncate">{plan.name}</p>
        <p className="text-sm text-zinc-400 mt-0.5">
          {trainingDayCount}{" "}
          {trainingDayCount === 1 ? "Trainingstag" : "Trainingstage"} ·{" "}
          {exerciseCount} {exerciseCount === 1 ? "Übung" : "Übungen"}
        </p>
        <p className="text-xs text-zinc-500 mt-1">
          Letztes Training: {formatLastSession(plan.lastSessionAt)}
        </p>
      </div>

      {statuses.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mt-3">
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

      <div className="flex flex-wrap gap-2 mt-4">
        <Button
          size="sm"
          className="rounded-xl flex-1 min-w-[7rem]"
          onClick={() => void startPlan()}
        >
          <Play className="h-4 w-4 mr-1.5" />
          Starten
        </Button>
        <Link href={`/workouts/plans/${plan.id}`} className="flex-1 min-w-[7rem]">
          <Button size="sm" variant="secondary" className="rounded-xl w-full">
            <Pencil className="h-4 w-4 mr-1.5" />
            Bearbeiten
          </Button>
        </Link>
        <Button
          size="sm"
          variant="outline"
          className="rounded-xl border-red-500/40 text-red-400 hover:bg-red-500/10"
          onClick={confirmDelete}
        >
          <Trash2 className="h-4 w-4 mr-1.5" />
          Löschen
        </Button>
      </div>
    </li>
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
    <div className="space-y-5 pb-24 max-w-lg mx-auto">
      <WorkoutBackLink />
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-white">Meine Pläne</h1>
        <Link href="/workouts/create">
          <Button size="sm" className="rounded-xl">
            <Plus className="h-4 w-4 mr-1" />
            Neu
          </Button>
        </Link>
      </div>

      {showSkeleton && (
        <ul className="space-y-2">
          {[1, 2, 3].map((i) => (
            <li key={i} className="h-24 rounded-2xl bg-zinc-900 border border-zinc-800" />
          ))}
        </ul>
      )}

      {!showSkeleton && (
        <ul className="space-y-2">
          {plans.map((plan) => (
            <PlanRow key={plan.id} plan={plan} onDelete={deletePlan} />
          ))}
        </ul>
      )}

      {!loading && plans.length === 0 && (
        <div className="rounded-2xl border border-dashed border-zinc-700 py-14 text-center">
          <p className="text-zinc-500 mb-4">Noch keine Pläne</p>
          <Link href="/workouts/create">
            <Button className="rounded-xl">Plan erstellen</Button>
          </Link>
        </div>
      )}
    </div>
  );
}
