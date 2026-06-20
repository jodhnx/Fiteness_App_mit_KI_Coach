"use client";

import { useRouter } from "next/navigation";
import { Play, Dumbbell, Sparkles, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { isSameDay } from "date-fns";
import type { HomeDataPayload } from "@/lib/home-defaults";
import { getPlanRecoveryMessage } from "@/lib/recovery-shared";
import type { MuscleRecovery } from "@/lib/recovery-shared";

type Props = {
  nextWorkout: HomeDataPayload["nextWorkout"];
  activeSessionId?: string | null;
  lastCompleted?: HomeDataPayload["lastCompletedWorkout"];
  recoveryMuscles?: MuscleRecovery[];
};

export function HomeNextTrainingCard({
  nextWorkout,
  activeSessionId,
  lastCompleted,
  recoveryMuscles = [],
}: Props) {
  const router = useRouter();

  async function startTraining() {
    if (activeSessionId) {
      router.push(`/workouts/live/${activeSessionId}`);
      return;
    }
    if (!nextWorkout?.dayId) {
      router.push("/workouts/quick");
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

  const recommendation =
    recoveryMuscles.length > 0
      ? getPlanRecoveryMessage(
          recoveryMuscles.filter((m) => m.recoveryPercent >= 70).map((m) => m.muscle),
          recoveryMuscles
        )
      : "Starte ein Quick Workout oder wähle einen Plan.";

  const completedToday =
    lastCompleted?.completedAt &&
    isSameDay(new Date(lastCompleted.completedAt), new Date());

  if (activeSessionId) {
    return (
      <div className="rounded-3xl border border-cyan-500/30 bg-cyan-950/25 p-5">
        <p className="text-xs font-semibold uppercase tracking-wide text-cyan-300/80 mb-2">
          Training läuft
        </p>
        <Button className="w-full h-14 text-base rounded-2xl" onClick={startTraining}>
          <Play className="h-5 w-5 mr-2" />
          Training fortsetzen
        </Button>
      </div>
    );
  }

  if (completedToday) {
    return (
      <div className="rounded-3xl border border-emerald-500/25 bg-emerald-950/20 p-5">
        <div className="flex items-center gap-2 mb-3">
          <CheckCircle2 className="h-5 w-5 text-emerald-400" />
          <p className="text-sm font-semibold text-emerald-200">Training abgeschlossen</p>
        </div>
        {lastCompleted?.name && (
          <p className="text-xs text-zinc-500 mb-3 truncate">{lastCompleted.name}</p>
        )}
        <Button className="w-full h-14 text-base rounded-2xl" onClick={startTraining}>
          <Play className="h-5 w-5 mr-2" />
          Neues Training starten
        </Button>
      </div>
    );
  }

  if (nextWorkout?.dayId) {
    const exercises = nextWorkout.exerciseCount ?? 0;
    return (
      <div className="rounded-3xl border border-cyan-500/25 bg-cyan-950/20 p-5">
        <p className="text-xs font-semibold uppercase tracking-wide text-cyan-300/80 mb-2">
          Nächstes Training
        </p>
        <div className="flex items-start gap-3">
          <div className="h-12 w-12 rounded-2xl bg-cyan-500/15 flex items-center justify-center shrink-0">
            <Dumbbell className="h-6 w-6 text-cyan-400" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-lg font-bold text-white truncate">{nextWorkout.dayName}</p>
            <p className="text-sm text-zinc-400 truncate">{nextWorkout.planName}</p>
            {exercises > 0 && (
              <p className="text-xs text-zinc-500 mt-1">{exercises} Übungen geplant</p>
            )}
          </div>
        </div>
        <Button className="w-full mt-4 h-14 text-base rounded-2xl" onClick={startTraining}>
          <Play className="h-5 w-5 mr-2" />
          Training starten
        </Button>
      </div>
    );
  }

  return (
    <div className="rounded-3xl border border-zinc-800 bg-zinc-900/60 p-5">
      <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500 mb-2">
        Nächstes Training
      </p>
      <div className="flex items-start gap-3">
        <div className="h-12 w-12 rounded-2xl bg-violet-500/15 flex items-center justify-center shrink-0">
          <Sparkles className="h-6 w-6 text-violet-400" />
        </div>
        <p className="text-sm text-zinc-300 leading-relaxed flex-1">{recommendation}</p>
      </div>
      <Button
        variant="secondary"
        className="w-full mt-4 h-12 rounded-2xl"
        onClick={() => router.push("/workouts/quick")}
      >
        Quick Workout starten
      </Button>
    </div>
  );
}
