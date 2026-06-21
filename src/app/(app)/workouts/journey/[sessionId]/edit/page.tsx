"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { WorkoutBackLink } from "@/components/workout/workout-back-link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CACHE_KEYS } from "@/lib/cache-manager";
import { invalidateCache } from "@/lib/client-cache";
import { toast } from "sonner";
import { Save } from "lucide-react";
import { WORKOUT_INPUT_PLACEHOLDERS } from "@/lib/workout-input-placeholders";

type WorkoutSetRow = {
  id: string;
  exerciseName: string;
  setNumber: number;
  reps: number | null;
  weightKg: number | null;
};

type SessionPayload = {
  session: {
    id: string;
    name: string;
    status: string;
    sets: WorkoutSetRow[];
  };
};

/** Edit completed workout — all fields editable */
export default function EditJourneyWorkoutPage() {
  const params = useParams();
  const router = useRouter();
  const sessionId = params.sessionId as string;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState("");
  const [sets, setSets] = useState<WorkoutSetRow[]>([]);

  useEffect(() => {
    let cancelled = false;
    void fetch(`/api/workouts/sessions/${sessionId}`)
      .then((r) => r.json())
      .then((d: SessionPayload) => {
        if (cancelled) return;
        if (!d.session) {
          toast.error("Workout nicht gefunden");
          router.replace("/workouts/journey");
          return;
        }
        setName(d.session.name);
        setSets(
          [...d.session.sets].sort(
            (a, b) =>
              a.exerciseName.localeCompare(b.exerciseName) || a.setNumber - b.setNumber
          )
        );
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [sessionId, router]);

  const grouped = useMemo(() => {
    const map = new Map<string, WorkoutSetRow[]>();
    for (const s of sets) {
      const list = map.get(s.exerciseName) ?? [];
      list.push(s);
      map.set(s.exerciseName, list);
    }
    return [...map.entries()];
  }, [sets]);

  const updateSet = useCallback(
    (id: string, patch: Partial<WorkoutSetRow>) => {
      setSets((prev) => prev.map((s) => (s.id === id ? { ...s, ...patch } : s)));
    },
    []
  );

  const renameExercise = useCallback((oldName: string, newName: string) => {
    setSets((prev) =>
      prev.map((s) => (s.exerciseName === oldName ? { ...s, exerciseName: newName } : s))
    );
  }, []);

  const save = useCallback(async () => {
    setSaving(true);
    try {
      const nameRes = await fetch(`/api/workouts/sessions/${sessionId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "editSession", name: name.trim() || "Workout" }),
      });
      if (!nameRes.ok) {
        toast.error("Speichern fehlgeschlagen");
        return;
      }

      await Promise.all(
        sets.map((s) =>
          fetch(`/api/workouts/sessions/${sessionId}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              action: "updateSet",
              setId: s.id,
              exerciseName: s.exerciseName,
              reps: s.reps ?? undefined,
              weightKg: s.weightKg ?? undefined,
            }),
          })
        )
      );

      toast.success("Workout aktualisiert");
      invalidateCache(CACHE_KEYS.JOURNEY);
      invalidateCache(CACHE_KEYS.PROGRESS);
      router.push("/workouts/journey");
    } finally {
      setSaving(false);
    }
  }, [name, sessionId, sets, router]);

  if (loading) {
    return (
      <div className="max-w-lg mx-auto pb-24 space-y-3">
        <WorkoutBackLink href="/workouts/journey" label="Fitness Journey" />
        <div className="h-10 rounded-xl bg-zinc-900 border border-zinc-800" />
        <div className="h-32 rounded-xl bg-zinc-900 border border-zinc-800" />
      </div>
    );
  }

  return (
    <div className="space-y-5 pb-28 max-w-lg mx-auto">
      <WorkoutBackLink href="/workouts/journey" label="Fitness Journey" />

      <div>
        <h1 className="text-2xl font-bold text-white">Workout bearbeiten</h1>
        <p className="text-sm text-zinc-500 mt-1">Übungen, Sätze und Gewichte anpassen</p>
      </div>

      <div>
        <label className="text-xs text-zinc-500 uppercase tracking-wide">Workout-Name</label>
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="mt-1.5 h-12 rounded-xl bg-zinc-950 border-zinc-700"
        />
      </div>

      <div className="space-y-4">
        {grouped.map(([exerciseName, exerciseSets]) => (
          <div
            key={exerciseName}
            className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-4 space-y-3"
          >
            <div>
              <label className="text-xs text-zinc-500">Übungsname</label>
              <Input
                value={exerciseName}
                onChange={(e) => renameExercise(exerciseName, e.target.value)}
                className="mt-1 h-10 rounded-xl bg-zinc-950 border-zinc-700 font-semibold"
              />
            </div>
            {exerciseSets.map((s) => (
              <div key={s.id} className="grid grid-cols-3 gap-2 items-end">
                <div>
                  <label className="text-[10px] text-zinc-600">Satz {s.setNumber}</label>
                  <Input
                    type="number"
                    value={s.reps ?? ""}
                    onChange={(e) =>
                      updateSet(s.id, {
                        reps: e.target.value === "" ? null : Number(e.target.value),
                      })
                    }
                    className="mt-0.5 h-10 rounded-lg bg-zinc-950 border-zinc-700 tabular-nums"
                    placeholder={WORKOUT_INPUT_PLACEHOLDERS.reps}
                  />
                </div>
                <div>
                  <label className="text-[10px] text-zinc-600">Gewicht (kg)</label>
                  <Input
                    type="number"
                    step="0.5"
                    value={s.weightKg ?? ""}
                    onChange={(e) =>
                      updateSet(s.id, {
                        weightKg: e.target.value === "" ? null : Number(e.target.value),
                      })
                    }
                    className="mt-0.5 h-10 rounded-lg bg-zinc-950 border-zinc-700 tabular-nums"
                    placeholder={WORKOUT_INPUT_PLACEHOLDERS.weightKg}
                  />
                </div>
                <p className="text-xs text-zinc-600 pb-2 text-center">Satz {s.setNumber}</p>
              </div>
            ))}
          </div>
        ))}
      </div>

      <Button
        className="w-full h-14 rounded-2xl"
        disabled={saving}
        onClick={() => void save()}
      >
        <Save className="h-5 w-5 mr-2" />
        Erneut speichern
      </Button>
    </div>
  );
}
