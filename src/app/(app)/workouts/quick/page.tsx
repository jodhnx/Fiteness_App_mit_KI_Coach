"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { WorkoutBackLink } from "@/components/workout/workout-back-link";
import { Button } from "@/components/ui/button";
import { Play, Plus, X, Zap } from "lucide-react";
import { toast } from "sonner";
import { startWorkoutAndNavigate } from "@/lib/workout-start";
import { ExercisePickerSheet } from "@/components/workout/exercise-picker-sheet";
import type { LibraryExercise } from "@/hooks/use-exercise-library-search";

/** Quick Workout — Übungen wählen, dann starten. Kein Plan nötig. */
export default function QuickWorkoutPage() {
  const router = useRouter();
  const [pickerOpen, setPickerOpen] = useState(false);
  const [picked, setPicked] = useState<LibraryExercise[]>([]);
  const [starting, setStarting] = useState(false);

  const startWorkout = useCallback(async () => {
    setStarting(true);
    const result = await startWorkoutAndNavigate(router, {
      action: "start",
      name: "Quick Workout",
      exercises: picked.map((ex) => ({
        exerciseLibraryId: ex.id,
        exerciseName: ex.name,
      })),
    });
    setStarting(false);
    if (!result.ok) toast.error(result.error);
  }, [router, picked]);

  return (
    <div className="space-y-6 pb-28 max-w-lg mx-auto min-h-[70dvh] flex flex-col">
      <WorkoutBackLink />
      <div className="flex-1 flex flex-col">
        <div className="rounded-3xl border border-white/[0.08] bg-zinc-900/60 p-6 text-center">
          <Zap className="h-12 w-12 text-zinc-300 mx-auto mb-3" />
          <h1 className="text-2xl font-bold text-white">Quick Workout</h1>
          <p className="text-zinc-400 text-sm mt-2 leading-relaxed">
            Übungen wählen, dann starten — ohne Plan.
          </p>
        </div>

        <ul className="mt-4 space-y-2">
          {picked.map((ex) => (
            <li
              key={ex.id}
              className="flex items-center justify-between rounded-2xl border border-white/[0.06] bg-zinc-900/60 px-4 py-3"
            >
              <div className="min-w-0">
                <p className="font-medium text-white truncate">{ex.name}</p>
                <p className="text-xs text-zinc-500 truncate">
                  {ex.muscleGroup}
                  {ex.equipment ? ` · ${ex.equipment}` : ""}
                </p>
              </div>
              <Button
                type="button"
                size="icon"
                variant="ghost"
                className="h-11 w-11"
                onClick={() => setPicked((prev) => prev.filter((p) => p.id !== ex.id))}
                aria-label="Übung entfernen"
              >
                <X className="h-4 w-4" />
              </Button>
            </li>
          ))}
        </ul>

        <Button
          type="button"
          variant="outline"
          className="mt-3 h-12 rounded-2xl border-dashed"
          onClick={() => setPickerOpen(true)}
        >
          <Plus className="h-4 w-4 mr-2" />
          Übung hinzufügen
        </Button>
      </div>

      <Button
        className="w-full h-16 text-lg rounded-2xl"
        disabled={starting}
        onClick={() => void startWorkout()}
      >
        <Play className="h-6 w-6 mr-2" />
        {starting ? "Startet…" : "Start"}
      </Button>

      <ExercisePickerSheet
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        onPick={(ex) => {
          setPicked((prev) => (prev.some((p) => p.id === ex.id) ? prev : [...prev, ex]));
          setPickerOpen(false);
        }}
        excludeIds={picked.map((p) => p.id)}
      />
    </div>
  );
}
