"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { WorkoutBackLink } from "@/components/workout/workout-back-link";
import { ExercisePickerSheet } from "@/components/workout/exercise-picker-sheet";
import { Button } from "@/components/ui/button";
import { Plus, Play, Trash2, Zap } from "lucide-react";
import type { LibraryExercise } from "@/hooks/use-exercise-library-search";
import { toast } from "sonner";

type PickedExercise = {
  id: string;
  name: string;
  muscleGroup: string;
};

export default function QuickWorkoutPage() {
  const router = useRouter();
  const [exercises, setExercises] = useState<PickedExercise[]>([]);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [starting, setStarting] = useState(false);

  const addExercise = useCallback((ex: LibraryExercise) => {
    setExercises((prev) => {
      if (prev.some((p) => p.id === ex.id)) return prev;
      return [...prev, { id: ex.id, name: ex.name, muscleGroup: ex.muscleGroup }];
    });
  }, []);

  async function startWorkout() {
    if (exercises.length === 0) {
      toast.error("Mindestens eine Übung auswählen");
      return;
    }
    setStarting(true);
    const res = await fetch("/api/workouts/sessions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "start",
        name: "Quick Workout",
        exercises: exercises.map((e) => ({
          exerciseLibraryId: e.id,
          exerciseName: e.name,
        })),
      }),
    });
    const data = await res.json();
    setStarting(false);
    if (!res.ok) {
      toast.error(data.error ?? "Training konnte nicht gestartet werden");
      return;
    }
    router.push(`/workouts/live/${data.session.id}`);
  }

  return (
    <div className="space-y-5 pb-28 max-w-lg mx-auto">
      <WorkoutBackLink />
      <div>
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <Zap className="h-7 w-7 text-amber-400" />
          Quick Workout
        </h1>
        <p className="text-zinc-400 text-sm mt-1">Übungen wählen und sofort loslegen</p>
      </div>

      <Button
        className="w-full h-14 text-base rounded-2xl"
        variant="outline"
        onClick={() => setPickerOpen(true)}
      >
        <Plus className="h-5 w-5 mr-2" />
        Übung hinzufügen
      </Button>

      <div className="space-y-2">
        {exercises.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-zinc-700 py-14 text-center text-zinc-500 text-sm">
            Noch keine Übungen — tippe oben zum Hinzufügen
          </div>
        ) : (
          exercises.map((ex, i) => (
            <div
              key={ex.id}
              className="flex items-center gap-3 rounded-2xl border border-zinc-800 bg-zinc-900/60 px-4 py-3.5"
            >
              <span className="text-zinc-500 font-medium w-6 tabular-nums">{i + 1}</span>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-white truncate">{ex.name}</p>
                <p className="text-xs text-zinc-500">{ex.muscleGroup}</p>
              </div>
              <button
                type="button"
                className="p-2 text-zinc-500 hover:text-red-400"
                onClick={() => setExercises((prev) => prev.filter((e) => e.id !== ex.id))}
                aria-label="Entfernen"
              >
                <Trash2 className="h-5 w-5" />
              </button>
            </div>
          ))
        )}
      </div>

      {exercises.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 p-4 pb-[max(1rem,env(safe-area-inset-bottom))] bg-zinc-950/95 border-t border-zinc-800 backdrop-blur-md">
          <div className="max-w-lg mx-auto">
            <Button
              className="w-full h-14 text-base rounded-2xl"
              disabled={starting}
              onClick={startWorkout}
            >
              <Play className="h-5 w-5 mr-2" />
              {starting ? "Startet…" : "Training starten"}
            </Button>
          </div>
        </div>
      )}

      <ExercisePickerSheet
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        onPick={addExercise}
        excludeIds={exercises.map((e) => e.id)}
      />
    </div>
  );
}
