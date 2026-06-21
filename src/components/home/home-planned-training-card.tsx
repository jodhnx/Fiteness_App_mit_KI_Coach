"use client";

import { memo, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Play, Dumbbell, Clock, CheckCircle2, Trophy, Flame, Timer, Layers, Weight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { isSameDay } from "date-fns";
import type { HomeDataPayload } from "@/lib/home-defaults";
import { muscleGroupsForWorkout } from "@/lib/home-smart-layout";
import { startWorkoutAndNavigate } from "@/lib/workout-start";
import type { MuscleRecovery } from "@/lib/recovery-shared";
import { cn } from "@/lib/utils";

type Props = {
  nextWorkout: HomeDataPayload["nextWorkout"];
  activeSessionId?: string | null;
  lastCompleted?: HomeDataPayload["lastCompletedWorkout"];
  recoveryMuscles?: MuscleRecovery[];
  highlight?: boolean;
};

const DONE_HEADLINES = [
  { icon: CheckCircle2, text: "Heutiges Workout abgeschlossen" },
  { icon: Flame, text: "Training für heute erledigt" },
  { icon: Trophy, text: "Stark! Du hast dein heutiges Training geschafft" },
] as const;

function formatDuration(sec?: number): string {
  if (!sec || sec <= 0) return "—";
  const min = Math.round(sec / 60);
  if (min < 60) return `${min} min`;
  return `${Math.floor(min / 60)}h ${min % 60} min`;
}

function formatVolume(kg?: number): string {
  if (!kg || kg <= 0) return "—";
  return `${Math.round(kg).toLocaleString("de-DE")} kg`;
}

export const HomePlannedTrainingCard = memo(function HomePlannedTrainingCard({
  nextWorkout,
  activeSessionId,
  lastCompleted,
  recoveryMuscles = [],
  highlight,
}: Props) {
  const router = useRouter();

  const startTraining = useCallback(async () => {
    if (activeSessionId) {
      router.push(`/workouts/live/${activeSessionId}`);
      return;
    }
    if (!nextWorkout?.dayId) {
      router.push("/workouts/quick");
      return;
    }
    const result = await startWorkoutAndNavigate(router, {
      action: "start",
      workoutPlanId: nextWorkout.planId,
      workoutDayId: nextWorkout.dayId,
      name: `${nextWorkout.planName} – ${nextWorkout.dayName}`,
    });
    if (!result.ok) toast.error(result.error);
  }, [activeSessionId, nextWorkout, router]);

  const completedToday =
    lastCompleted?.completedAt &&
    isSameDay(new Date(lastCompleted.completedAt), new Date());

  if (activeSessionId) {
    return (
      <div
        className={cn(
          "rounded-[1.25rem] border border-cyan-500/35 bg-cyan-950/25 p-5",
          "shadow-[0_0_32px_-8px_rgba(34,211,238,0.35)]"
        )}
      >
        <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-cyan-300/90 mb-3">
          Heute geplant · läuft
        </p>
        <Button className="w-full h-14 text-base rounded-2xl" onClick={() => void startTraining()}>
          <Play className="h-5 w-5 mr-2" />
          Training fortsetzen
        </Button>
      </div>
    );
  }

  if (completedToday) {
    const headline = DONE_HEADLINES[new Date().getDate() % DONE_HEADLINES.length];
    const HeadlineIcon = headline.icon;

    return (
      <div className="rounded-[1.25rem] border border-emerald-500/30 bg-emerald-950/20 p-5">
        <div className="flex items-center gap-2 mb-4">
          <HeadlineIcon className="h-5 w-5 text-emerald-400 shrink-0" />
          <p className="text-sm font-semibold text-emerald-200">{headline.text}</p>
        </div>

        {lastCompleted?.name && (
          <p className="text-base font-bold text-white mb-3 truncate">{lastCompleted.name}</p>
        )}

        <div className="grid grid-cols-3 gap-2 mb-4">
          <div className="rounded-xl bg-zinc-900/60 border border-zinc-800/80 px-2 py-2.5 text-center">
            <Timer className="h-4 w-4 text-emerald-400 mx-auto mb-1" />
            <p className="text-[10px] text-zinc-500 uppercase tracking-wide">Dauer</p>
            <p className="text-sm font-semibold text-white">
              {formatDuration(lastCompleted?.durationSec)}
            </p>
          </div>
          <div className="rounded-xl bg-zinc-900/60 border border-zinc-800/80 px-2 py-2.5 text-center">
            <Layers className="h-4 w-4 text-emerald-400 mx-auto mb-1" />
            <p className="text-[10px] text-zinc-500 uppercase tracking-wide">Übungen</p>
            <p className="text-sm font-semibold text-white">
              {lastCompleted?.exerciseCount ?? "—"}
            </p>
          </div>
          <div className="rounded-xl bg-zinc-900/60 border border-zinc-800/80 px-2 py-2.5 text-center">
            <Weight className="h-4 w-4 text-emerald-400 mx-auto mb-1" />
            <p className="text-[10px] text-zinc-500 uppercase tracking-wide">Volumen</p>
            <p className="text-sm font-semibold text-white">
              {formatVolume(lastCompleted?.volumeKg)}
            </p>
          </div>
        </div>

        <Button
          className="w-full h-12 rounded-2xl"
          variant="secondary"
          onClick={() => router.push("/workouts/quick")}
        >
          Weiteres Workout
        </Button>
      </div>
    );
  }

  const muscles = nextWorkout
    ? muscleGroupsForWorkout(nextWorkout.dayName, recoveryMuscles)
    : [];
  const durationMin =
    nextWorkout?.estimatedDurationMin ??
    (nextWorkout?.exerciseCount ? Math.max(25, nextWorkout.exerciseCount * 8) : 45);

  return (
    <div
      className={cn(
        "rounded-[1.25rem] border p-5",
        highlight
          ? "border-cyan-500/40 bg-gradient-to-br from-cyan-950/40 to-zinc-950 shadow-[0_0_36px_-8px_rgba(34,211,238,0.3)]"
          : "border-zinc-800/90 bg-zinc-900/50"
      )}
    >
      <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-zinc-500 mb-3">
        Heute geplant
      </p>

      {nextWorkout?.dayId ? (
        <>
          <div className="flex items-start gap-3 mb-3">
            <div className="h-11 w-11 rounded-xl bg-cyan-500/15 flex items-center justify-center shrink-0 ring-1 ring-cyan-500/25">
              <Dumbbell className="h-5 w-5 text-cyan-400" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-lg font-bold text-white truncate">{nextWorkout.dayName}</p>
              <p className="text-sm text-zinc-400 truncate">{nextWorkout.planName}</p>
              <div className="flex items-center gap-3 mt-1.5 text-xs text-zinc-500">
                <span className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  ~{durationMin} min
                </span>
                {nextWorkout.exerciseCount != null && nextWorkout.exerciseCount > 0 && (
                  <span>{nextWorkout.exerciseCount} Übungen</span>
                )}
              </div>
            </div>
          </div>

          {muscles.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mb-4">
              {muscles.map((m) => (
                <span
                  key={m}
                  className="text-[10px] font-medium px-2 py-1 rounded-lg bg-zinc-800/80 text-zinc-300 border border-zinc-700/60"
                >
                  {m}
                </span>
              ))}
            </div>
          )}

          <Button className="w-full h-14 text-base rounded-2xl" onClick={() => void startTraining()}>
            <Play className="h-5 w-5 mr-2" />
            Training starten
          </Button>
        </>
      ) : (
        <>
          <p className="text-sm text-zinc-400 mb-4 leading-relaxed">
            Kein Plan für heute — starte ein Quick Workout oder wähle einen Plan.
          </p>
          <Button className="w-full h-12 rounded-2xl" onClick={() => router.push("/workouts/quick")}>
            Quick Workout
          </Button>
        </>
      )}
    </div>
  );
});
