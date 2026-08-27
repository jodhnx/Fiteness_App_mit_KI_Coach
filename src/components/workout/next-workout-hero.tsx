"use client";

import { memo, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Dumbbell, Play } from "lucide-react";
import type { HomeDataPayload } from "@/lib/home-defaults";
import { startWorkoutAndNavigate } from "@/lib/workout-start";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

type Props = {
  home: HomeDataPayload | null;
};

/** Strong-inspired next workout hero — one tap to start. */
export const NextWorkoutHero = memo(function NextWorkoutHero({ home }: Props) {
  const router = useRouter();
  const next = home?.nextWorkout;

  const start = useCallback(async () => {
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
    if (!result.ok) toast.error(result.error);
  }, [next, router]);

  const title = next?.dayName ?? "Quick Workout";
  const subtitle = next?.planName ?? "Sofort starten · Kein Plan nötig";
  const exerciseCount = next?.exerciseCount;
  const durationMin = next?.estimatedDurationMin;

  const metaParts: string[] = [];
  if (exerciseCount != null && exerciseCount > 0) {
    metaParts.push(`${exerciseCount} Übungen`);
  }
  if (durationMin != null && durationMin > 0) {
    metaParts.push(`ca. ${durationMin} Min.`);
  }

  return (
    <section className="rounded-[1.75rem] border border-white/[0.08] bg-gradient-to-b from-zinc-900/95 to-zinc-950 px-4 py-4 space-y-3">
      <div className="flex items-start gap-3">
        <div className="h-11 w-11 rounded-2xl bg-violet-500/15 border border-violet-500/25 flex items-center justify-center shrink-0">
          <Dumbbell className="h-5 w-5 text-violet-400" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-zinc-500">
            Nächstes Training
          </p>
          <h2 className="text-xl font-bold text-white leading-tight mt-0.5 truncate">
            {title}
          </h2>
          <p className="text-sm text-zinc-400 mt-0.5 truncate">{subtitle}</p>
          {metaParts.length > 0 && (
            <p className="text-xs text-zinc-500 mt-1 tabular-nums">{metaParts.join(" · ")}</p>
          )}
        </div>
      </div>
      <Button
        type="button"
        className="h-14 w-full rounded-2xl text-base font-bold tracking-wide"
        onClick={() => void start()}
      >
        <Play className="mr-2 h-5 w-5 fill-current" />
        Training starten
      </Button>
    </section>
  );
});
