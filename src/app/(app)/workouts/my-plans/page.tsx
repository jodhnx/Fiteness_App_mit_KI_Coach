"use client";

import { useCachedFetch } from "@/hooks/use-cached-fetch";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { WorkoutBackLink } from "@/components/workout/workout-back-link";
import { Button } from "@/components/ui/button";
import { Play, Plus } from "lucide-react";

type PlanExercise = {
  targetSets: number;
  targetReps: string;
  setTargets?: unknown;
};

type PlanDay = {
  id: string;
  name: string;
  exercises: PlanExercise[];
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

export default function MyPlansPage() {
  const router = useRouter();
  const { data, loading } = useCachedFetch<{ plans: Plan[] }>(
    "workouts-my-plans-list",
    "/api/workouts/plans",
    120_000,
    8000,
    { revalidateOnMount: true, staleRatio: 0.9 }
  );

  const plans = data?.plans ?? [];

  async function startPlan(plan: Plan) {
    const day = plan.days.find((d) => d.exercises.length > 0) ?? plan.days[0];
    if (!day) return;
    const res = await fetch("/api/workouts/sessions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "start",
        workoutPlanId: plan.id,
        workoutDayId: day.id,
        name: plan.name,
      }),
    });
    const sessionData = await res.json();
    if (res.ok) router.push(`/workouts/live/${sessionData.session.id}`);
  }

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

      {loading && plans.length === 0 && (
        <div className="space-y-3 animate-pulse">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-24 rounded-2xl bg-zinc-800" />
          ))}
        </div>
      )}

      <div className="space-y-3">
        {plans.map((plan) => {
          const count = exerciseCount(plan.days);
          return (
            <div
              key={plan.id}
              className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-4 flex items-center gap-3"
            >
              <Link href={`/workouts/plans/${plan.id}`} className="flex-1 min-w-0">
                <p className="text-lg font-bold text-white truncate">{plan.name}</p>
                <p className="text-sm text-zinc-400 mt-0.5">
                  {count} {count === 1 ? "Übung" : "Übungen"}
                </p>
                <p className="text-xs text-zinc-500 mt-1">
                  Letztes Training: {formatLastSession(plan.lastSessionAt)}
                </p>
              </Link>
              <Button
                className="h-12 px-5 rounded-xl shrink-0"
                disabled={count === 0}
                onClick={() => startPlan(plan)}
              >
                <Play className="h-4 w-4 mr-1.5" />
                Start
              </Button>
            </div>
          );
        })}
      </div>

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
