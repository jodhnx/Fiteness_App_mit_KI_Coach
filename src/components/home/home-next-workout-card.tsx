"use client";

import { useRouter } from "next/navigation";
import { Play, Dumbbell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import type { HomeDataPayload } from "@/lib/home-defaults";

type Props = {
  nextWorkout: NonNullable<HomeDataPayload["nextWorkout"]>;
  activeSessionId?: string | null;
};

export function HomeNextWorkoutCard({ nextWorkout, activeSessionId }: Props) {
  const router = useRouter();

  async function startTraining() {
    if (activeSessionId) {
      router.push(`/workouts/live/${activeSessionId}`);
      return;
    }
    if (!nextWorkout.dayId) {
      router.push(`/workouts/plans/${nextWorkout.planId}`);
      return;
    }
    const res = await fetch("/api/workouts/sessions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "start",
        workoutPlanId: nextWorkout.planId,
        workoutDayId: nextWorkout.dayId,
        name: `${nextWorkout.planName} – ${nextWorkout.dayName}`,
      }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      toast.error("Training konnte nicht gestartet werden");
      return;
    }
    router.push(`/workouts/live/${data.session.id}`);
  }

  const exercises = nextWorkout.exerciseCount ?? 0;
  const duration = nextWorkout.estimatedDurationMin ?? Math.max(30, exercises * 8 + 10);

  return (
    <div className="rounded-xl border border-cyan-500/25 bg-cyan-950/20 p-4">
      <div className="flex items-start gap-3">
        <div className="h-9 w-9 rounded-lg bg-cyan-500/15 flex items-center justify-center shrink-0">
          <Dumbbell className="h-4 w-4 text-cyan-400" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[10px] uppercase tracking-wide text-cyan-300/80">Nächstes Training</p>
          <p className="text-base font-bold text-white mt-0.5 truncate">{nextWorkout.dayName}</p>
          <p className="text-xs text-zinc-400 mt-1 tabular-nums">
            {exercises > 0 ? `${exercises} Übungen` : nextWorkout.planName}
            {duration > 0 && ` · ca. ${duration} Min.`}
          </p>
        </div>
      </div>
      <Button className="w-full mt-3 h-11" onClick={startTraining}>
        <Play className="h-4 w-4 mr-2" />
        Training starten
      </Button>
    </div>
  );
}
