"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Check, Plus, Timer, Trash2, Trophy, Dumbbell } from "lucide-react";
import { EndWorkoutDialog } from "@/components/workout/end-workout-dialog";
import { ExercisePickerSheet } from "@/components/workout/exercise-picker-sheet";
import { clearActiveWorkoutCaches, PENDING_LIVE_SESSION_KEY } from "@/lib/workout-cache-sync";
import { WORKOUT_INPUT_PLACEHOLDERS } from "@/lib/workout-input-placeholders";
import type { LibraryExercise } from "@/hooks/use-exercise-library-search";

const WORKOUT_SEQ_KEY = "workout-save-seq";

function nextDefaultWorkoutName() {
  if (typeof window === "undefined") return "Workout 001";
  const n = Number(localStorage.getItem(WORKOUT_SEQ_KEY) ?? "0") + 1;
  return `Workout ${String(n).padStart(3, "0")}`;
}

function bumpWorkoutSeq() {
  if (typeof window === "undefined") return;
  const n = Number(localStorage.getItem(WORKOUT_SEQ_KEY) ?? "0") + 1;
  localStorage.setItem(WORKOUT_SEQ_KEY, String(n));
}

type SetRow = {
  id: string;
  exerciseLibraryId: string | null;
  exerciseName: string;
  setNumber: number;
  reps: number | null;
  weightKg: number | null;
  rpe: number | null;
  restSeconds: number | null;
  completed: boolean;
  notes: string | null;
};

type SessionData = {
  id: string;
  name: string;
  startedAt: string;
  sets: SetRow[];
};

export function LiveWorkout({ sessionId }: { sessionId: string }) {
  const router = useRouter();
  const [session, setSession] = useState<SessionData | null>(null);
  const [previousByExercise, setPreviousByExercise] = useState<Record<string, SetRow[]>>({});
  const [elapsed, setElapsed] = useState(0);
  const [restLeft, setRestLeft] = useState(0);
  const [endOpen, setEndOpen] = useState(false);
  const [defaultEndName, setDefaultEndName] = useState("Workout 001");
  const [pickerOpen, setPickerOpen] = useState(false);
  const patchTimers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  const load = useCallback(async () => {
    const res = await fetch(`/api/workouts/sessions/${sessionId}`);
    const data = await res.json();
    if (res.ok) {
      setSession(data.session);
      setPreviousByExercise(data.previousByExercise ?? {});
    }
  }, [sessionId]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const raw = sessionStorage.getItem(PENDING_LIVE_SESSION_KEY);
    if (raw) {
      try {
        const pending = JSON.parse(raw) as SessionData;
        if (pending.id === sessionId) {
          setSession(pending);
          sessionStorage.removeItem(PENDING_LIVE_SESSION_KEY);
        }
      } catch {
        /* ignore */
      }
    }
    load();
  }, [sessionId, load]);

  useEffect(() => {
    if (!session) return;
    const start = new Date(session.startedAt).getTime();
    const t = setInterval(() => {
      setElapsed(Math.floor((Date.now() - start) / 1000));
    }, 1000);
    return () => clearInterval(t);
  }, [session]);

  useEffect(() => {
    if (restLeft <= 0) return;
    const t = setInterval(() => setRestLeft((r) => Math.max(0, r - 1)), 1000);
    return () => clearInterval(t);
  }, [restLeft]);

  useEffect(() => {
    const timers = patchTimers.current;
    return () => {
      timers.forEach((t) => clearTimeout(t));
      timers.clear();
    };
  }, []);

  const grouped = useMemo(() => {
    if (!session) return [];
    const map = new Map<string, SetRow[]>();
    for (const s of session.sets) {
      const k = s.exerciseLibraryId ?? s.exerciseName;
      if (!map.has(k)) map.set(k, []);
      map.get(k)!.push(s);
    }
    return Array.from(map.entries()).map(([key, sets]) => ({
      key,
      name: sets[0]?.exerciseName ?? key,
      exerciseLibraryId: sets[0]?.exerciseLibraryId ?? null,
      sets: sets.sort((a, b) => a.setNumber - b.setNumber),
    }));
  }, [session]);

  const completedSets = session?.sets.filter((s) => s.completed).length ?? 0;
  const totalSets = session?.sets.length ?? 0;
  const totalVolume = useMemo(
    () =>
      session?.sets.reduce(
        (acc, s) => acc + (s.weightKg ?? 0) * (s.reps ?? 0),
        0
      ) ?? 0,
    [session]
  );

  async function patchSet(setId: string, data: Partial<SetRow>, immediate = false) {
    const prev = session;
    setSession((s) => {
      if (!s) return s;
      return {
        ...s,
        sets: s.sets.map((row) => (row.id === setId ? { ...row, ...data } : row)),
      };
    });

    const send = async () => {
      try {
        const res = await fetch(`/api/workouts/sessions/${sessionId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "updateSet", setId, ...data }),
        });
        if (!res.ok) {
          setSession(prev);
          toast.error("Speichern fehlgeschlagen");
        }
      } catch {
        setSession(prev);
        toast.error("Speichern fehlgeschlagen");
      }
    };

    if (immediate) {
      await send();
      return;
    }

    const existing = patchTimers.current.get(setId);
    if (existing) clearTimeout(existing);
    patchTimers.current.set(
      setId,
      setTimeout(() => {
        patchTimers.current.delete(setId);
        void send();
      }, 400)
    );
  }

  async function deleteSet(setId: string) {
    const prev = session;
    setSession((s) => {
      if (!s) return s;
      return { ...s, sets: s.sets.filter((row) => row.id !== setId) };
    });
    try {
      const res = await fetch(`/api/workouts/sessions/${sessionId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "deleteSet", setId }),
      });
      if (!res.ok) {
        setSession(prev);
        toast.error("Satz konnte nicht gelöscht werden");
      }
    } catch {
      setSession(prev);
    }
  }

  async function addSet(exerciseName: string, exerciseLibraryId: string | null, setNumber: number) {
    const lastSet = session?.sets
      .filter((s) => s.exerciseName === exerciseName)
      .sort((a, b) => b.setNumber - a.setNumber)[0];

    const tempId = `temp-set-${Date.now()}`;
    const optimistic: SetRow = {
      id: tempId,
      exerciseLibraryId,
      exerciseName,
      setNumber,
      reps: lastSet?.reps ?? null,
      weightKg: lastSet?.weightKg ?? null,
      rpe: null,
      restSeconds: lastSet?.restSeconds ?? 90,
      completed: false,
      notes: null,
    };

    setSession((s) => (s ? { ...s, sets: [...s.sets, optimistic] } : s));

    try {
      const res = await fetch(`/api/workouts/sessions/${sessionId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "addSet",
          exerciseName,
          exerciseLibraryId: exerciseLibraryId ?? undefined,
          setNumber,
          reps: optimistic.reps ?? undefined,
          weightKg: optimistic.weightKg ?? undefined,
          restSeconds: optimistic.restSeconds ?? 90,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setSession((s) =>
          s ? { ...s, sets: s.sets.filter((row) => row.id !== tempId) } : s
        );
        return;
      }
      const created = data.set as SetRow;
      setSession((s) =>
        s
          ? { ...s, sets: s.sets.map((row) => (row.id === tempId ? created : row)) }
          : s
      );
    } catch {
      setSession((s) =>
        s ? { ...s, sets: s.sets.filter((row) => row.id !== tempId) } : s
      );
    }
  }

  async function addExerciseFromPicker(ex: LibraryExercise) {
    const existing = session?.sets.filter(
      (s) => s.exerciseLibraryId === ex.id || s.exerciseName === ex.name
    );
    if (existing && existing.length > 0) {
      toast.message("Übung bereits im Workout");
      return;
    }
    setPickerOpen(false);
    void addSet(ex.name, ex.id, 1);
  }

  function saveCompletedWorkout(name: string) {
    setEndOpen(false);
    clearActiveWorkoutCaches({
      name,
      completedAt: new Date().toISOString(),
    });
    bumpWorkoutSeq();
    router.push("/workouts/journey");

    void fetch(`/api/workouts/sessions/${sessionId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "complete", name }),
    })
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) {
          toast.error("Fehler beim Speichern — bitte erneut versuchen");
          return;
        }
        clearActiveWorkoutCaches({
          name: data.session?.name ?? name,
          completedAt: data.session?.completedAt ?? new Date().toISOString(),
        });
        if (data.newPRs?.length) {
          toast.success(`${data.newPRs.length} neue Personal Records!`, {
            icon: <Trophy className="h-4 w-4" />,
          });
        }
      })
      .catch(() => {
        toast.error("Netzwerkfehler beim Speichern");
      });
  }

  function openEndDialog() {
    setDefaultEndName(nextDefaultWorkoutName());
    setEndOpen(true);
  }

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec.toString().padStart(2, "0")}`;
  };

  if (!session) {
    return (
      <div className="space-y-4 max-w-lg mx-auto">
        <div className="h-24 rounded-2xl bg-zinc-900/80 border border-zinc-800" />
        <div className="h-40 rounded-2xl bg-zinc-900/80 border border-zinc-800" />
      </div>
    );
  }

  return (
    <>
      <EndWorkoutDialog
        open={endOpen}
        defaultName={defaultEndName}
        onSave={(name) => saveCompletedWorkout(name)}
        onCancel={() => setEndOpen(false)}
      />
    <div className="space-y-4 pb-36 max-w-lg mx-auto keyboard-stable-page">
      <div className="sticky top-0 z-20 py-3 bg-zinc-950/95 backdrop-blur-md border-b border-zinc-800/50 -mx-1 px-1">
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/80 p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h1 className="text-base font-semibold text-zinc-400">{session.name}</h1>
              <p className="text-4xl font-bold text-cyan-400 font-mono tabular-nums mt-1">
                {formatTime(elapsed)}
              </p>
              <p className="text-xs text-zinc-500 mt-1">
                {completedSets}/{totalSets} Sätze · {Math.round(totalVolume).toLocaleString("de-DE")} kg
              </p>
            </div>
            <Button className="h-12 px-5 rounded-xl shrink-0" onClick={openEndDialog}>
              Training beenden
            </Button>
          </div>
          {restLeft > 0 && (
            <div className="flex items-center gap-2 mt-3 rounded-xl bg-cyan-500/15 border border-cyan-500/30 px-4 py-3">
              <Timer className="h-5 w-5 text-cyan-400" />
              <span className="text-2xl font-bold text-cyan-400 tabular-nums">{formatTime(restLeft)}</span>
              <span className="text-sm text-zinc-400 ml-1">Pause</span>
            </div>
          )}
          {restLeft <= 0 && (
            <Button
              variant="secondary"
              className="w-full h-12 mt-3 rounded-xl"
              onClick={() => setRestLeft(90)}
            >
              90s Pause starten
            </Button>
          )}
        </div>
      </div>

      {grouped.length === 0 && (
        <div className="rounded-2xl border border-dashed border-zinc-700 py-12 text-center px-4">
          <Dumbbell className="h-10 w-10 text-zinc-600 mx-auto mb-3" />
          <p className="text-zinc-400 text-sm">Noch keine Übungen — füge deine erste hinzu.</p>
          <Button
            className="mt-4 h-12 rounded-xl"
            onClick={() => setPickerOpen(true)}
          >
            <Plus className="h-5 w-5 mr-2" />
            Übung hinzufügen
          </Button>
        </div>
      )}

      {grouped.map(({ key, name, exerciseLibraryId, sets }) => {
        const prev = previousByExercise[key]?.[0];
        return (
          <div key={key} className="rounded-2xl border border-zinc-800 bg-zinc-900/60 overflow-hidden">
            <div className="px-4 py-3.5 border-b border-zinc-800/80">
              <h2 className="text-xl font-bold text-white">{name}</h2>
              {prev && (
                <p className="text-xs text-zinc-500 mt-0.5">
                  Letzte:{" "}
                  {prev.weightKg != null || prev.reps != null
                    ? `${prev.weightKg ?? "—"} kg × ${prev.reps ?? "—"}`
                    : "—"}
                </p>
              )}
            </div>
            <div className="p-3 space-y-2">
              <div className="grid grid-cols-[4.5rem_1fr_1fr_3.5rem_3.5rem] gap-2 text-[10px] uppercase tracking-wide text-zinc-500 px-0.5">
                <span>Satz</span>
                <span>Gewicht</span>
                <span>Wdh</span>
                <span />
                <span />
              </div>
              {sets.map((set, index) => (
                <div
                  key={set.id}
                  className={`grid grid-cols-[4.5rem_1fr_1fr_3.5rem_3.5rem] gap-2 items-center rounded-xl p-1.5 ${
                    set.completed
                      ? "bg-cyan-500/15 border border-cyan-500/35"
                      : "bg-zinc-800/50"
                  }`}
                >
                  <span className="text-base font-semibold text-zinc-300 pl-2 tabular-nums">
                    {index + 1}
                  </span>
                  <Input
                    type="number"
                    inputMode="decimal"
                    placeholder={WORKOUT_INPUT_PLACEHOLDERS.weightKg}
                    className="h-14 text-xl text-center rounded-xl tabular-nums keyboard-stable-input"
                    value={set.weightKg ?? ""}
                    onChange={(e) => {
                      const v = e.target.value;
                      setSession((prev) => {
                        if (!prev) return prev;
                        return {
                          ...prev,
                          sets: prev.sets.map((s) =>
                            s.id === set.id
                              ? { ...s, weightKg: v === "" ? null : Number(v) }
                              : s
                          ),
                        };
                      });
                    }}
                    onBlur={(e) => {
                      const v = e.target.value;
                      patchSet(set.id, {
                        weightKg: v === "" ? null : Number(v),
                      });
                    }}
                  />
                  <Input
                    type="number"
                    inputMode="numeric"
                    placeholder={WORKOUT_INPUT_PLACEHOLDERS.reps}
                    className="h-14 text-xl text-center rounded-xl tabular-nums keyboard-stable-input"
                    value={set.reps ?? ""}
                    onChange={(e) => {
                      const v = e.target.value;
                      setSession((prev) => {
                        if (!prev) return prev;
                        return {
                          ...prev,
                          sets: prev.sets.map((s) =>
                            s.id === set.id
                              ? { ...s, reps: v === "" ? null : Number(v) }
                              : s
                          ),
                        };
                      });
                    }}
                    onBlur={(e) => {
                      const v = e.target.value;
                      patchSet(set.id, { reps: v === "" ? null : Number(v) });
                    }}
                  />
                  <Button
                    size="icon"
                    variant={set.completed ? "default" : "secondary"}
                    className="h-14 w-14 rounded-xl"
                    onClick={async () => {
                      await patchSet(set.id, { completed: !set.completed }, true);
                      if (!set.completed) setRestLeft(set.restSeconds ?? 90);
                    }}
                  >
                    <Check className="h-6 w-6" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-14 w-14 rounded-xl"
                    disabled={sets.length <= 1}
                    onClick={() => deleteSet(set.id)}
                  >
                    <Trash2 className="h-5 w-5 text-red-400" />
                  </Button>
                </div>
              ))}
              <Button
                variant="outline"
                className="w-full h-12 mt-1 rounded-xl border-dashed border-zinc-700"
                onClick={() => addSet(name, exerciseLibraryId, sets.length + 1)}
              >
                <Plus className="h-4 w-4 mr-2" />
                Satz hinzufügen
              </Button>
            </div>
          </div>
        );
      })}

      <div className="fixed bottom-0 left-0 right-0 p-4 pb-[max(1rem,env(safe-area-inset-bottom))] bg-zinc-950/95 border-t border-zinc-800">
        <div className="max-w-lg mx-auto">
          <Button
            variant="outline"
            className="w-full h-14 rounded-2xl border-dashed border-cyan-500/40 text-cyan-300"
            onClick={() => setPickerOpen(true)}
          >
            <Plus className="h-5 w-5 mr-2" />
            Übung hinzufügen
          </Button>
        </div>
      </div>

      <ExercisePickerSheet
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        onPick={addExerciseFromPicker}
        excludeIds={
          grouped
            .map((g) => g.exerciseLibraryId)
            .filter((id): id is string => Boolean(id))
        }
      />
    </div>
    </>
  );
}
