"use client";

import { memo, useEffect, useMemo } from "react";
import { useCachedFetch } from "@/hooks/use-cached-fetch";
import Link from "next/link";
import { WorkoutBackLink } from "@/components/workout/workout-back-link";
import { Button } from "@/components/ui/button";
import {
  DayStatusIndicator,
  dayStatusRowClass,
} from "@/components/workout/day-status-indicator";
import type { DayStatus } from "@/lib/plan-day-status";
import { CACHE_KEYS } from "@/lib/cache-manager";
import { getCached } from "@/lib/client-cache";
import { hasScreenLoaded, markScreenLoaded } from "@/lib/storage-service";
import { ChevronRight, Plus } from "lucide-react";
import { cn } from "@/lib/utils";

type DayStatusRow = { id: string; name: string; status: DayStatus };

type Plan = {
  id: string;
  name: string;
  days: { id: string; name: string; exercises: unknown[] }[];
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

const PlanRow = memo(function PlanRow({ plan }: { plan: Plan }) {
  const exerciseCount = plan.days.reduce((s, d) => s + d.exercises.length, 0);
  const statuses = (plan.dayStatuses ?? []).filter((d) => d.status !== "rest");
  const trainingDayCount = plan.days.filter((d) => d.exercises.length > 0).length;

  return (
    <li>
      <Link
        href={`/workouts/plans/${plan.id}/days`}
        prefetch
        className="block rounded-2xl border border-zinc-800 bg-zinc-900/60 px-4 py-4 active:bg-zinc-800/80"
      >
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0 flex-1">
            <p className="text-lg font-bold text-white truncate">{plan.name}</p>
            <p className="text-sm text-zinc-400 mt-0.5">
              {trainingDayCount} {trainingDayCount === 1 ? "Trainingstag" : "Trainingstage"} · {exerciseCount}{" "}
              {exerciseCount === 1 ? "Übung" : "Übungen"}
            </p>
            <p className="text-xs text-zinc-500 mt-1">
              Letztes Training: {formatLastSession(plan.lastSessionAt)}
            </p>
          </div>
          <ChevronRight className="h-5 w-5 text-zinc-500 shrink-0" />
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
      </Link>
    </li>
  );
});

/** MyPlansScreen */
export default function MyPlansPage() {
  const hadCache = useMemo(
    () => getCached(CACHE_KEYS.PLANS_LIST) != null || hasScreenLoaded("my-plans"),
    []
  );

  const { data, loading } = useCachedFetch<{ plans: Plan[] }>(
    CACHE_KEYS.PLANS_LIST,
    "/api/workouts/plans",
    120_000,
    8000,
    { revalidateOnMount: false, staleRatio: 0.98 }
  );

  useEffect(() => {
    if (data?.plans) markScreenLoaded("my-plans");
  }, [data]);

  const plans = data?.plans ?? [];
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
            <PlanRow key={plan.id} plan={plan} />
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
