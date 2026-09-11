"use client";

import { memo, useCallback, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Dumbbell, Play, Zap } from "lucide-react";
import type { HomeDataPayload } from "@/lib/home-defaults";
import { startWorkoutAndNavigate } from "@/lib/workout-start";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

type Props = {
  home: HomeDataPayload | null;
  hasPlans?: boolean;
};

const CARD =
  "rounded-2xl border border-zinc-200/90 bg-white px-4 py-4 space-y-3 shadow-sm dark:border-white/[0.08] dark:bg-zinc-900/80 dark:shadow-none";

/** Strong-inspired next workout hero — one tap to start. */
export const NextWorkoutHero = memo(function NextWorkoutHero({ home, hasPlans }: Props) {
  const router = useRouter();
  const next = home?.nextWorkout;
  const [starting, setStarting] = useState(false);
  const startLock = useRef(false);

  const start = useCallback(async () => {
    if (startLock.current || starting) return;
    startLock.current = true;
    setStarting(true);
    try {
      if (!next?.dayId) {
        router.push("/workouts/quick");
        return;
      }
      const result = await startWorkoutAndNavigate(router, {
        action: "start",
        workoutPlanId: next.planId,
        workoutDayId: next.dayId,
        name: `${next.planName} – ${next.dayName}`,
      });
      if (!result.ok) {
        toast.error(result.error);
        startLock.current = false;
        setStarting(false);
      }
    } catch {
      toast.error("Training konnte nicht gestartet werden");
      startLock.current = false;
      setStarting(false);
    }
  }, [next, router, starting]);

  if (!hasPlans && !next?.dayId) {
    return (
      <section className={cn(CARD, "py-5")}>
        <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-zinc-500">
          Heutiges Training
        </p>
        <h2 className="text-xl font-bold text-zinc-900 dark:text-white leading-tight">
          Noch kein Trainingsplan
        </h2>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          Erstelle einen Plan oder starte direkt ein Quick Workout.
        </p>
        <div className="space-y-2">
          <Button
            type="button"
            className="h-12 w-full rounded-2xl font-semibold"
            onClick={() => router.push("/workouts/create")}
          >
            Plan erstellen
          </Button>
          <Button
            type="button"
            variant="outline"
            className="h-12 w-full rounded-2xl font-semibold"
            onClick={() => router.push("/workouts/quick")}
          >
            Quick Workout
          </Button>
          <Button
            type="button"
            variant="ghost"
            className="h-12 w-full rounded-2xl font-semibold text-zinc-700 dark:text-white"
            onClick={() => router.push("/workouts/generator")}
          >
            KI-Plan erstellen
          </Button>
        </div>
      </section>
    );
  }

  if (!next?.dayId) {
    return (
      <section className={CARD}>
        <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-zinc-500">
          Heutiges Training
        </p>
        <h2 className="text-xl font-bold text-zinc-900 dark:text-white leading-tight">
          Ruhetag
        </h2>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          Kein geplantes Training heute.
        </p>
        <Button
          type="button"
          variant="outline"
          className="h-14 w-full rounded-2xl text-base font-semibold"
          onClick={() => router.push("/workouts/quick")}
        >
          <Zap className="mr-2 h-5 w-5" />
          Quick Workout
        </Button>
      </section>
    );
  }

  const title = next.dayName;
  const subtitle = next.planName;
  const exerciseCount = next.exerciseCount;
  const durationMin = next.estimatedDurationMin;

  const metaParts: string[] = [];
  if (exerciseCount != null && exerciseCount > 0) {
    metaParts.push(`${exerciseCount} Übungen`);
  }
  if (durationMin != null && durationMin > 0) {
    metaParts.push(`ca. ${durationMin} Min.`);
  }

  return (
    <section className={CARD}>
      <div className="flex items-start gap-3">
        <div className="h-11 w-11 rounded-2xl bg-accent/10 border border-accent/20 flex items-center justify-center shrink-0 dark:bg-white/[0.06] dark:border-white/[0.08]">
          <Dumbbell className="h-5 w-5 text-accent dark:text-zinc-200" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-zinc-500">
            Heutiges Training
          </p>
          <h2 className="text-xl font-bold text-zinc-900 dark:text-white leading-tight mt-0.5 truncate">
            {title}
          </h2>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-0.5 truncate">
            {subtitle}
          </p>
          {metaParts.length > 0 && (
            <p className="text-xs text-zinc-500 mt-1 tabular-nums">
              {metaParts.join(" · ")}
            </p>
          )}
        </div>
      </div>
      <Button
        type="button"
        className="h-14 w-full rounded-2xl text-base font-bold tracking-wide"
        disabled={starting}
        onClick={() => void start()}
      >
        <Play className="mr-2 h-5 w-5 fill-current" />
        {starting ? "Startet…" : "Training starten"}
      </Button>
    </section>
  );
});
