"use client";

import { useCallback } from "react";
import { useRouter } from "next/navigation";
import { WorkoutBackLink } from "@/components/workout/workout-back-link";
import { Button } from "@/components/ui/button";
import { Play, Zap } from "lucide-react";
import { toast } from "sonner";
import { startWorkoutAndNavigate } from "@/lib/workout-start";

/** Quick Workout — sofort starten, Übungen im Training hinzufügen */
export default function QuickWorkoutPage() {
  const router = useRouter();

  const startWorkout = useCallback(async () => {
    const result = await startWorkoutAndNavigate(router, {
      action: "start",
      name: "Quick Workout",
    });
    if (!result.ok) toast.error(result.error);
  }, [router]);

  return (
    <div className="space-y-6 pb-28 max-w-lg mx-auto min-h-[70dvh] flex flex-col">
      <WorkoutBackLink />
      <div className="flex-1 flex flex-col justify-center">
        <div className="rounded-3xl border border-amber-500/25 bg-zinc-900/60 p-8 text-center">
          <Zap className="h-14 w-14 text-amber-400 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-white">Quick Workout</h1>
          <p className="text-zinc-400 text-sm mt-2 leading-relaxed">
            Wie im Gym: Training starten, dann Übungen und Sätze nach Bedarf hinzufügen.
          </p>
          <ul className="text-left text-sm text-zinc-500 mt-6 space-y-2 max-w-xs mx-auto">
            <li>✓ Trainingsuhr startet sofort</li>
            <li>✓ Übungen während des Workouts hinzufügen</li>
            <li>✓ Gewicht & Wiederholungen live eintragen</li>
          </ul>
        </div>
      </div>

      <Button
        className="w-full h-16 text-lg rounded-2xl"
        onClick={() => void startWorkout()}
      >
        <Play className="h-6 w-6 mr-2" />
        Workout starten
      </Button>
    </div>
  );
}
