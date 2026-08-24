"use client";

import { useCallback, useEffect, useMemo, useRef, useState, memo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Check, Plus, Timer, Trash2, Trophy, Dumbbell } from "lucide-react";
import { EndWorkoutDialog } from "@/components/workout/end-workout-dialog";
import { ExercisePickerSheet } from "@/components/workout/exercise-picker-sheet";
import { clearActiveWorkoutCaches, PENDING_LIVE_SESSION_KEY } from "@/lib/workout-cache-sync";
import { hapticSuccess, hapticTap } from "@/lib/haptic";
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

const LiveSetRow = memo(function LiveSetRow({
  set,
  index,
  canDelete,
  onPatch,
  onComplete,
  onDelete,
}: {
  set: SetRow;
  index: number;
  canDelete: boolean;
  onPatch: (setId: string, data: Partial<SetRow>) => void;
  onComplete: (set: SetRow) => void;
  onDelete: (setId: string) => void;
}) {
  const [weight, setWeight] = useState(
    set.weightKg == null ? "" : String(set.weightKg)
  );
  const [reps, setReps] = useState(set.reps == null ? "" : String(set.reps));

  useEffect(() => {
    setWeight(set.weightKg == null ? "" : String(set.weightKg));
    setReps(set.reps == null ? "" : String(set.reps));
  }, [set.id, set.weightKg, set.reps]);

  return (
    <div
      className={`grid grid-cols-[2.75rem_minmax(0,1fr)_minmax(0,1fr)_3.25rem_3.25rem] gap-2 items-center rounded-xl p-1.5 ${
        set.completed
          ? "bg-cyan-500/15 border border-cyan-500/35"
          : "bg-zinc-800/50"
      }`}
    >
      <span className="text-base font-semibold text-zinc-300 pl-1 tabular-nums">
        {index + 1}
      </span>
      <div className="flex items-center gap-1.5 min-w-0">
        <Input
          type="text"
          inputMode="decimal"
          pattern="[0-9]*[.,]?[0-9]*"
          placeholder={WORKOUT_INPUT_PLACEHOLDERS.weightKg}
          className="h-14 min-w-0 flex-1 text-xl text-center rounded-xl tabular-nums keyboard-stable-input"
          value={weight}
          onChange={(e) => {
            setWeight(e.target.value.replace(",", ".").replace(/[^0-9.]/g, ""));
          }}
          onBlur={() => {
            const v = weight.replace(",", ".").replace(/[^0-9.]/g, "");
            onPatch(set.id, {
              weightKg: v === "" || v === "." ? null : Number(v),
            });
          }}
        />
        <span className="text-xs font-semibold text-zinc-500 shrink-0 w-6">KG</span>
      </div>
      <div className="flex items-center gap-1.5 min-w-0">
        <Input
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          placeholder={WORKOUT_INPUT_PLACEHOLDERS.reps}
          className="h-14 min-w-0 flex-1 text-xl text-center rounded-xl tabular-nums keyboard-stable-input"
          value={reps}
          onChange={(e) => {
            setReps(e.target.value.replace(/[^0-9]/g, ""));
          }}
          onBlur={() => {
            const v = reps.replace(/[^0-9]/g, "");
            onPatch(set.id, { reps: v === "" ? null : Number(v) });
          }}
        />
        <span className="text-[10px] font-semibold text-zinc-500 shrink-0 w-8">
          REPS
        </span>
      </div>
      <Button
        size="icon"
        variant={set.completed ? "default" : "secondary"}
        className="h-14 w-14 rounded-xl"
        onClick={() => {
            const w = weight.replace(",", ".").replace(/[^0-9.]/g, "");
            const r = reps.replace(/[^0-9]/g, "");
            const parsedW = Number(w);
            const parsedR = Number(r);
            onComplete({
              ...set,
              weightKg:
                w === "" || w === "." || !Number.isFinite(parsedW)
                  ? set.weightKg
                  : parsedW,
              reps: r === "" || !Number.isFinite(parsedR) ? set.reps : parsedR,
            });
          }}
        aria-label={set.completed ? "Satz wieder öffnen" : "Satz abschließen"}
      >
        <Check className="h-6 w-6" />
      </Button>
      <Button
        size="icon"
        variant="ghost"
        className="h-14 w-14 rounded-xl"
        disabled={!canDelete}
        onClick={() => onDelete(set.id)}
      >
        <Trash2 className="h-5 w-5 text-red-400" />
      </Button>
    </div>
  );
});

function formatWorkoutTime(s: number) {
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${m}:${sec.toString().padStart(2, "0")}`;
}

const LiveElapsedClock = memo(function LiveElapsedClock({
  startedAt,
}: {
  startedAt: string;
}) {
  const [elapsed, setElapsed] = useState(() =>
    Math.max(0, Math.floor((Date.now() - new Date(startedAt).getTime()) / 1000))
  );

  useEffect(() => {
    const start = new Date(startedAt).getTime();
    const t = setInterval(() => {
      setElapsed(Math.max(0, Math.floor((Date.now() - start) / 1000)));
    }, 1000);
    return () => clearInterval(t);
  }, [startedAt]);

  return (
    <p className="text-4xl font-bold text-cyan-400 font-mono tabular-nums mt-1">
      {formatWorkoutTime(elapsed)}
    </p>
  );
});

const LiveRestTimer = memo(function LiveRestTimer({
  restUntil,
  onStartRest,
  onClearRest,
}: {
  restUntil: number | null;
  onStartRest: (seconds: number) => void;
  onClearRest: () => void;
}) {
  const [left, setLeft] = useState(0);

  useEffect(() => {
    if (restUntil == null) {
      setLeft(0);
      return;
    }
    let finished = false;
    const tick = () => {
      const remaining = Math.max(0, Math.ceil((restUntil - Date.now()) / 1000));
      setLeft(remaining);
      if (remaining <= 0 && !finished) {
        finished = true;
        onClearRest();
      }
    };
    tick();
    const t = setInterval(tick, 250);
    return () => clearInterval(t);
  }, [restUntil, onClearRest]);

  if (left > 0) {
    return (
      <div className="flex items-center gap-2 mt-3 rounded-xl bg-cyan-500/15 border border-cyan-500/30 px-3 py-2">
        <Timer className="h-5 w-5 text-cyan-400 shrink-0" />
        <span className="text-2xl font-bold text-cyan-400 tabular-nums">
          {formatWorkoutTime(left)}
        </span>
        <span className="text-sm text-zinc-400">Pause</span>
        <button
          type="button"
          className="ml-auto min-h-11 rounded-xl px-3 text-sm font-semibold text-cyan-200 active:bg-cyan-500/20"
          onClick={onClearRest}
        >
          Überspringen
        </button>
      </div>
    );
  }

  return (
    <div className="mt-3 grid grid-cols-3 gap-2">
      {[60, 90, 120].map((sec) => (
        <Button
          key={sec}
          variant="secondary"
          className="h-11 rounded-xl text-sm"
          onClick={() => onStartRest(sec)}
        >
          {sec}s Pause
        </Button>
      ))}
    </div>
  );
});

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
  const [restUntil, setRestUntil] = useState<number | null>(null);
  const [endOpen, setEndOpen] = useState(false);
  const [defaultEndName, setDefaultEndName] = useState("Workout 001");
  const [pickerOpen, setPickerOpen] = useState(false);
  const patchTimers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());
  const sessionRef = useRef<SessionData | null>(null);
  sessionRef.current = session;

  const startRest = useCallback((seconds: number) => {
    setRestUntil(Date.now() + seconds * 1000);
  }, []);
  const clearRest = useCallback(() => setRestUntil(null), []);

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
        (acc, s) =>
          s.completed ? acc + (s.weightKg ?? 0) * (s.reps ?? 0) : acc,
        0
      ) ?? 0,
    [session]
  );

  const patchSet = useCallback(
    async (setId: string, data: Partial<SetRow>, immediate = false) => {
      const prev = sessionRef.current;
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
    },
    [sessionId]
  );

  const deleteSet = useCallback(
    async (setId: string) => {
      const prev = sessionRef.current;
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
    },
    [sessionId]
  );

  const completeSet = useCallback(
    (row: SetRow) => {
      void patchSet(
        row.id,
        {
          completed: !row.completed,
          weightKg: row.weightKg,
          reps: row.reps,
        },
        true
      );
      if (!row.completed) {
        hapticTap();
        startRest(row.restSeconds ?? 90);
      }
    },
    [patchSet, startRest]
  );

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

  async function saveCompletedWorkout(name: string) {
    setEndOpen(false);
    hapticSuccess();
    clearActiveWorkoutCaches({
      name,
      completedAt: new Date().toISOString(),
    });
    bumpWorkoutSeq();

    try {
      const res = await fetch(`/api/workouts/sessions/${sessionId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "complete", name }),
      });
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
      router.push(`/workouts/summary/${sessionId}`);
    } catch {
      toast.error("Netzwerkfehler beim Speichern");
    }
  }

  function openEndDialog() {
    setDefaultEndName(nextDefaultWorkoutName());
    setEndOpen(true);
  }

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
        completedSets={completedSets}
        totalSets={totalSets}
        volumeKg={Math.round(totalVolume)}
        onSave={(name) => void saveCompletedWorkout(name)}
        onCancel={() => setEndOpen(false)}
      />
    <div className="space-y-4 pb-36 max-w-lg mx-auto keyboard-stable-page">
      <div className="sticky top-0 z-20 py-3 bg-zinc-950/95 backdrop-blur-md border-b border-zinc-800/50 -mx-1 px-1">
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/80 p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h1 className="text-base font-semibold text-zinc-400">{session.name}</h1>
              <LiveElapsedClock startedAt={session.startedAt} />
              <p className="text-xs text-zinc-400 mt-1">
                {completedSets}/{totalSets} Sätze · {Math.round(totalVolume).toLocaleString("de-DE")} kg
              </p>
            </div>
            <Button className="h-12 px-5 rounded-xl shrink-0" onClick={openEndDialog}>
              Training beenden
            </Button>
          </div>
          <LiveRestTimer
            restUntil={restUntil}
            onStartRest={startRest}
            onClearRest={clearRest}
          />
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
              {exerciseLibraryId ? (
                <Link
                  href={`/workouts/exercises/${exerciseLibraryId}`}
                  className="text-xl font-bold text-white"
                >
                  {name}
                </Link>
              ) : (
                <h2 className="text-xl font-bold text-white">{name}</h2>
              )}
              {prev && (
                <p className="text-xs text-zinc-400 mt-0.5">
                  Letzte:{" "}
                  {prev.weightKg != null || prev.reps != null
                    ? `${prev.weightKg ?? "—"} kg × ${prev.reps ?? "—"}`
                    : "—"}
                </p>
              )}
            </div>
            <div className="p-3 space-y-2">
              <div className="grid grid-cols-[2.75rem_minmax(0,1fr)_minmax(0,1fr)_3.25rem_3.25rem] gap-2 text-[10px] uppercase tracking-wide text-zinc-500 px-0.5">
                <span>Satz</span>
                <span>Gewicht</span>
                <span>Wdh</span>
                <span />
                <span />
              </div>
              {sets.map((set, index) => (
                <LiveSetRow
                  key={set.id}
                  set={set}
                  index={index}
                  canDelete={sets.length > 1}
                  onPatch={patchSet}
                  onComplete={completeSet}
                  onDelete={deleteSet}
                />
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

      <div className="fixed bottom-0 left-0 right-0 z-40 p-4 pb-[max(1rem,env(safe-area-inset-bottom))] bg-zinc-950/95 border-t border-zinc-800">
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
