"use client";

import { memo, useMemo } from "react";
import { useCachedFetch } from "@/hooks/use-cached-fetch";
import Link from "next/link";
import { useParams } from "next/navigation";
import { WorkoutBackLink } from "@/components/workout/workout-back-link";
import {
  DayStatusIndicator,
  dayStatusRowClass,
} from "@/components/workout/day-status-indicator";
import type { DayStatus } from "@/lib/plan-day-status";
import { ChevronRight, Settings2 } from "lucide-react";
import { cn } from "@/lib/utils";

type PlanExercise = {
  id: string;
  targetSets: number;
  targetReps: string;
  exercise: { name: string };
};

type PlanDay = {
  id: string;
  name: string;
  dayOrder: number;
  exercises: PlanExercise[];
};

type PlanPayload = {
  plan: { id: string; name: string; days: PlanDay[] };
  dayStatuses?: Record<string, DayStatus>;
};

const WEEKDAY = ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"];

const DayRow = memo(function DayRow({
  planId,
  day,
  status,
  weekday,
}: {
  planId: string;
  day: PlanDay;
  status: DayStatus;
  weekday: string;
}) {
  if (status === "rest") {
    return (
      <li
        className={cn(
          "flex items-center justify-between gap-3 rounded-2xl border px-4 py-4",
          dayStatusRowClass("rest")
        )}
      >
        <div className="flex items-center gap-3 min-w-0">
          <DayStatusIndicator status="rest" />
          <div>
            <p className="text-sm text-zinc-500">
              {weekday}: Pause
            </p>
          </div>
        </div>
        <span className="text-zinc-600 text-sm">—</span>
      </li>
    );
  }

  return (
    <li>
      <Link
        href={`/workouts/plans/${planId}/days/${day.id}`}
        prefetch
        className={cn(
          "flex items-center justify-between gap-3 rounded-2xl border px-4 py-4",
          dayStatusRowClass(status)
        )}
      >
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <DayStatusIndicator status={status} showLabel={false} />
          <div className="min-w-0">
            <p className="text-base font-semibold text-white truncate">
              {weekday}: {day.name}
            </p>
            <p className="text-sm text-zinc-500 mt-0.5">
              {day.exercises.length}{" "}
              {day.exercises.length === 1 ? "Übung" : "Übungen"}
              {status === "completed" && (
                <span className="text-[#4CAF50] ml-2">· Erledigt</span>
              )}
            </p>
          </div>
        </div>
        <ChevronRight className="h-5 w-5 text-zinc-500 shrink-0" />
      </Link>
    </li>
  );
});

/** PlanDetailScreen — Tagauswahl mit Status */
export default function PlanDaysPage() {
  const params = useParams();
  const planId = params.id as string;
  const cacheKey = `workout-plan-days-${planId}`;

  const { data } = useCachedFetch<PlanPayload>(
    cacheKey,
    `/api/workouts/plans/${planId}`,
    120_000,
    8000,
    { revalidateOnMount: false, staleRatio: 0.99 }
  );

  const plan = data?.plan;
  const dayStatuses = data?.dayStatuses ?? {};

  const days = useMemo(
    () => [...(plan?.days ?? [])].sort((a, b) => a.dayOrder - b.dayOrder),
    [plan?.days]
  );

  return (
    <div className="space-y-4 pb-24 max-w-lg mx-auto">
      <WorkoutBackLink href="/workouts/my-plans" label="Meine Pläne" />

      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white">{plan?.name ?? "Trainingsplan"}</h1>
          <p className="text-sm text-zinc-500 mt-1">Trainingstag wählen</p>
        </div>
        {plan && (
          <Link
            href={`/workouts/plans/${planId}`}
            prefetch
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-zinc-700 text-zinc-400"
            aria-label="Plan bearbeiten"
          >
            <Settings2 className="h-4 w-4" />
          </Link>
        )}
      </div>

      <ul className="space-y-2">
        {days.map((day, index) => (
          <DayRow
            key={day.id}
            planId={planId}
            day={day}
            status={dayStatuses[day.id] ?? (day.exercises.length === 0 ? "rest" : "open")}
            weekday={WEEKDAY[index % 7]}
          />
        ))}
      </ul>

      {plan && days.length === 0 && (
        <p className="text-center text-zinc-500 py-8 text-sm">
          Noch keine Trainingstage —{" "}
          <Link href={`/workouts/plans/${planId}`} className="text-cyan-400">
            Plan bearbeiten
          </Link>
        </p>
      )}
    </div>
  );
}
