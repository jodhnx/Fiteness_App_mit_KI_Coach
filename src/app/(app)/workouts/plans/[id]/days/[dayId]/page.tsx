"use client";

import { useCallback, useMemo } from "react";
import { useCachedFetch } from "@/hooks/use-cached-fetch";
import { useParams, useRouter } from "next/navigation";
import { WorkoutBackLink } from "@/components/workout/workout-back-link";
import { ExerciseItem } from "@/components/workout/exercise-item";
import { Button } from "@/components/ui/button";
import { Play } from "lucide-react";
import { toast } from "sonner";
import { startWorkoutAndNavigate } from "@/lib/workout-start";

type PlanExercise = {
  id: string;
  orderIndex: number;
  targetSets: number;
  targetReps: string;
  restSeconds: number;
  setTargets?: unknown;
  exercise: { id: string; name: string };
};

type PlanDay = {
  id: string;
  name: string;
  exercises: PlanExercise[];
};

type PlanPayload = {
  plan: { id: string; name: string; days: PlanDay[] };
};

/** WorkoutDayScreen — Gym Check-in Übersicht */
export default function WorkoutDayPage() {
  const params = useParams();
  const router = useRouter();
  const planId = params.id as string;
  const dayId = params.dayId as string;
  const cacheKey = `workout-plan-day-${planId}`;

  const { data } = useCachedFetch<PlanPayload>(
    cacheKey,
    `/api/workouts/plans/${planId}`,
    120_000,
    8000,
    { revalidateOnMount: false, staleRatio: 0.99 }
  );

  const plan = data?.plan;
  const day = plan?.days.find((d) => d.id === dayId);

  const exercises = useMemo(
    () => [...(day?.exercises ?? [])].sort((a, b) => a.orderIndex - b.orderIndex),
    [day?.exercises]
  );

  const startTraining = useCallback(async () => {
    if (!plan || !day) return;
    const result = await startWorkoutAndNavigate(router, {
      action: "start",
      workoutPlanId: plan.id,
      workoutDayId: day.id,
      name: `${plan.name} – ${day.name}`,
    });
    if (!result.ok) toast.error(result.error);
  }, [plan, day, router]);

  return (
    <div className="space-y-5 pb-28 max-w-lg mx-auto">
      <WorkoutBackLink href={`/workouts/plans/${planId}/days`} label="Trainingstage" />

      <div>
        <p className="text-sm text-zinc-500">{plan?.name}</p>
        <h1 className="text-2xl font-bold text-white mt-0.5">{day?.name ?? "Trainingstag"}</h1>
      </div>

      {exercises.length > 0 ? (
        <ul className="space-y-2">
          {exercises.map((ex) => (
            <li key={ex.id}>
              <ExerciseItem
                name={ex.exercise.name}
                targetSets={ex.targetSets}
                targetReps={ex.targetReps}
                restSeconds={ex.restSeconds}
                setTargets={ex.setTargets}
              />
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-zinc-500 py-6 text-center">Keine Übungen für diesen Tag.</p>
      )}

      <div className="sticky bottom-0 pt-4 pb-2 bg-gradient-to-t from-zinc-950 via-zinc-950/95 to-transparent">
        <Button
          className="w-full h-14 text-base rounded-2xl"
          onClick={() => void startTraining()}
        >
          <Play className="h-5 w-5 mr-2" />
          Training starten
        </Button>
      </div>
    </div>
  );
}
