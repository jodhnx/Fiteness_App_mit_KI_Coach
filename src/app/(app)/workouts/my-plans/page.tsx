"use client";

import { useCachedFetch } from "@/hooks/use-cached-fetch";
import Link from "next/link";
import { WorkoutBackLink } from "@/components/workout/workout-back-link";
import { Button } from "@/components/ui/button";
import { ChevronRight, Plus } from "lucide-react";

type PlanDay = {
  id: string;
  name: string;
  exercises: { targetSets: number; targetReps: string }[];
};

type Plan = {
  id: string;
  name: string;
  days: PlanDay[];
  lastSessionAt?: string | null;
};

function exerciseCount(days: PlanDay[]) {
  return days.reduce((sum, d) => sum + d.exercises.length, 0);
}

function formatLastSession(iso: string | null | undefined) {
  if (!iso) return "Noch nicht trainiert";
  return new Date(iso).toLocaleDateString("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

/** TrainingScreen — Meine Pläne Übersicht */
export default function MyPlansPage() {
  const { data } = useCachedFetch<{ plans: Plan[] }>(
    "workouts-my-plans-list",
    "/api/workouts/plans",
    120_000,
    8000,
    { revalidateOnMount: false, staleRatio: 0.95 }
  );

  const plans = data?.plans ?? [];

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

      <ul className="space-y-2">
        {plans.map((plan) => {
          const count = exerciseCount(plan.days);
          const dayCount = plan.days.length;
          return (
            <li key={plan.id}>
              <Link
                href={`/workouts/plans/${plan.id}/days`}
                prefetch
                className="flex items-center justify-between gap-3 rounded-2xl border border-zinc-800 bg-zinc-900/60 px-4 py-4 active:bg-zinc-800/80"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-lg font-bold text-white truncate">{plan.name}</p>
                  <p className="text-sm text-zinc-400 mt-0.5">
                    {dayCount} {dayCount === 1 ? "Tag" : "Tage"} · {count}{" "}
                    {count === 1 ? "Übung" : "Übungen"}
                  </p>
                  <p className="text-xs text-zinc-500 mt-1">
                    Letztes Training: {formatLastSession(plan.lastSessionAt)}
                  </p>
                </div>
                <ChevronRight className="h-5 w-5 text-zinc-500 shrink-0" />
              </Link>
            </li>
          );
        })}
      </ul>

      {plans.length === 0 && (
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
