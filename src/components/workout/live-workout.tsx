"use client";

import { useCallback, useEffect, useMemo, useRef, useState, memo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Check, Pause, Play, Plus, Timer, Trash2, Trophy, Dumbbell, ChevronLeft } from "lucide-react";
import { EndWorkoutDialog } from "@/components/workout/end-workout-dialog";
import { ExercisePickerSheet } from "@/components/workout/exercise-picker-sheet";
import { clearActiveWorkoutCaches, PENDING_LIVE_SESSION_KEY } from "@/lib/workout-cache-sync";
import { hapticSuccess, hapticTap } from "@/lib/haptic";
import {
  parseReps,
  parseWeightKg,
  sanitizeRepsInput,
  sanitizeWeightInput,
  formatLastPerformance,
  formatWorkoutClock,
  isNewWeightPr,
  validateCompleteSet,
} from "@/lib/workout-input";
import {
  addRestSeconds,
  clearLiveRestStorage,
  clearRest as emptyRest,
  pauseRest,
  readLiveRest,
  remainingRestSec,
  resumeRest,
  startRest as makeRest,
  writeLiveRest,
  type LiveRestState,
} from "@/lib/live-rest-timer";
import {
  mergeLiveSession,
  nextSetNumber,
  readLiveDraft,
  writeLiveDraft,
  clearLiveDraft,
  type LiveDraftSession,
} from "@/lib/live-session-draft";
import type { LibraryExercise } from "@/hooks/use-exercise-library-search";
import type { HomeDataPayload } from "@/lib/home-defaults";
import { cn } from "@/lib/utils";

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

type SaveState = "ok" | "pending" | "error";

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
  workoutSessionId?: string;
  saveState?: SaveState;
  exercise?: { muscleGroup?: string | null } | null;
};

const LiveSetRow = memo(function LiveSetRow({
  set,
  index,
  canDelete,
  onPatch,
  onComplete,
  onDelete,
  onRetry,
}: {
  set: SetRow;
  index: number;
  canDelete: boolean;
  onPatch: (setId: string, data: Partial<SetRow>) => void;
  onComplete: (set: SetRow) => void;
  onDelete: (setId: string) => void;
  onRetry: (set: SetRow) => void;
}) {
  const [weight, setWeight] = useState(
    set.weightKg == null ? "" : String(set.weightKg)
  );
  const [reps, setReps] = useState(set.reps == null ? "" : String(set.reps));
  const [localError, setLocalError] = useState<string | null>(null);
  const focused = useRef(false);
  const rowRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (focused.current) return;
    setWeight(set.weightKg == null ? "" : String(set.weightKg));
    setReps(set.reps == null ? "" : String(set.reps));
  }, [set.id, set.weightKg, set.reps]);

  const keepRowVisible = () => {
    focused.current = true;
    rowRef.current?.scrollIntoView({ block: "center", inline: "nearest" });
  };

  return (
    <div ref={rowRef} className="space-y-1 set-row-enter">
      <div
        className={cn(
          "grid grid-cols-[2.5rem_minmax(0,1fr)_minmax(0,1.1fr)_2.75rem] gap-2 items-center rounded-xl px-1.5 py-1 min-h-11",
          set.completed
            ? "bg-emerald-500/12 border border-emerald-500/25 set-complete-flash"
            : "bg-zinc-800/40 border border-transparent",
          set.saveState === "error" && "border-amber-500/40"
        )}
      >
        <span
          className={cn(
            "text-sm font-semibold tabular-nums pl-1",
            set.completed ? "text-emerald-300" : "text-zinc-400"
          )}
        >
          {index + 1}
        </span>
        <div className="flex items-center min-w-0">
          <Input
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            placeholder=""
            aria-label="Wiederholungen"
            className="h-11 min-w-0 flex-1 text-lg text-center rounded-xl tabular-nums keyboard-stable-input appearance-none"
            value={reps}
            onFocus={keepRowVisible}
            onChange={(e) => {
              const next = sanitizeRepsInput(e.target.value);
              if (next === "" || Number(next) <= 100) setReps(next);
              setLocalError(null);
            }}
            onBlur={() => {
              focused.current = false;
              onPatch(set.id, { reps: parseReps(reps) });
            }}
          />
        </div>
        <div className="flex items-center gap-1.5 min-w-0">
          <Input
            type="text"
            inputMode="decimal"
            pattern="[0-9]*[.,]?[0-9]*"
            placeholder=""
            aria-label="Gewicht in Kilogramm"
            className="h-11 min-w-0 flex-1 text-lg text-center rounded-xl tabular-nums keyboard-stable-input appearance-none"
            value={weight}
            onFocus={keepRowVisible}
            onChange={(e) => {
              setWeight(sanitizeWeightInput(e.target.value));
              setLocalError(null);
            }}
            onBlur={() => {
              focused.current = false;
              onPatch(set.id, { weightKg: parseWeightKg(weight) });
            }}
          />
          <span className="text-[10px] font-bold text-zinc-400 shrink-0 w-6 tracking-wide">
            KG
          </span>
        </div>
        <Button
          size="icon"
          variant={set.completed ? "default" : "secondary"}
          className={cn(
            "h-11 w-11 rounded-full",
            set.completed && "bg-emerald-500 text-zinc-950 hover:bg-emerald-400"
          )}
          disabled={set.saveState === "pending"}
          onClick={() => {
            if (typeof document !== "undefined") {
              (document.activeElement as HTMLElement | null)?.blur();
            }
            if (set.completed) {
              onComplete({ ...set, completed: true });
              return;
            }
            const parsed = validateCompleteSet(weight, reps);
            if (!parsed.ok) {
              setLocalError(parsed.error);
              return;
            }
            setLocalError(null);
            onComplete({ ...set, weightKg: parsed.weightKg, reps: parsed.reps });
          }}
          aria-label={set.completed ? "Satz wieder öffnen" : "Satz abschließen"}
        >
          {set.completed ? (
            <Check className="h-5 w-5" aria-hidden />
          ) : (
            <span className="h-4 w-4 rounded-full border-2 border-current" aria-hidden />
          )}
        </Button>
      </div>
      {(localError || set.saveState === "error" || canDelete) && (
        <div className="flex items-center justify-between px-1">
          {localError ? (
            <span className="text-[11px] font-medium text-amber-300 px-1">{localError}</span>
          ) : set.saveState === "error" ? (
            <button
              type="button"
              className="text-[11px] font-medium text-amber-300 min-h-11 px-1"
              onClick={() =>
                onRetry({
                  ...set,
                  weightKg: parseWeightKg(weight) ?? set.weightKg,
                  reps: parseReps(reps) ?? set.reps,
                })
              }
            >
              Sync failed · Retry
            </button>
          ) : (
            <span />
          )}
          {canDelete && (
            <Button
              size="icon"
              variant="ghost"
              className="h-11 w-11 rounded-xl"
              onClick={() => onDelete(set.id)}
              aria-label="Satz entfernen"
            >
              <Trash2 className="h-4 w-4 text-zinc-500" />
            </Button>
          )}
        </div>
      )}
    </div>
  );
});

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
    const tick = () => {
      setElapsed(Math.max(0, Math.floor((Date.now() - start) / 1000)));
    };
    tick();
    const t = setInterval(tick, 1000);
    const onVis = () => {
      if (document.visibilityState === "visible") tick();
    };
    document.addEventListener("visibilitychange", onVis);
    window.addEventListener("focus", onVis);
    return () => {
      clearInterval(t);
      document.removeEventListener("visibilitychange", onVis);
      window.removeEventListener("focus", onVis);
    };
  }, [startedAt]);

  return (
    <p className="text-base font-semibold text-white font-mono tabular-nums tracking-tight">
      {formatWorkoutClock(elapsed)}
    </p>
  );
});

const LiveRestTimer = memo(function LiveRestTimer({
  rest,
  onChange,
}: {
  rest: LiveRestState;
  onChange: (next: LiveRestState) => void;
}) {
  const [left, setLeft] = useState(() => remainingRestSec(rest, Date.now()));
  const paused = rest.pausedAt != null && (rest.remainingMs ?? 0) > 0;
  const endedRef = useRef(false);

  useEffect(() => {
    endedRef.current = false;
    const tick = () => {
      const remaining = remainingRestSec(rest, Date.now());
      setLeft(remaining);
      if (
        remaining <= 0 &&
        rest.endAt != null &&
        rest.pausedAt == null &&
        !endedRef.current
      ) {
        endedRef.current = true;
        onChange(emptyRest());
      }
    };
    tick();
    const t = setInterval(tick, 250);
    return () => clearInterval(t);
  }, [rest, onChange]);

  if (left <= 0 && !paused) return null;

  return (
    <div
      className="pointer-events-none fixed inset-x-0 z-50 px-3"
      style={{ bottom: "calc(5.25rem + env(safe-area-inset-bottom, 0px))" }}
    >
      <div className="pointer-events-auto mx-auto max-w-lg rounded-2xl border border-white/[0.1] bg-zinc-900/95 px-4 py-3 shadow-xl backdrop-blur-md">
        <div className="flex items-center gap-3">
          <Timer className="h-4 w-4 text-zinc-500 shrink-0" aria-hidden />
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-zinc-500">
              {paused ? "Pausiert" : "Rest"}
            </p>
            <p className="text-2xl font-semibold text-white tabular-nums leading-none mt-0.5">
              {formatWorkoutClock(left)}
            </p>
          </div>
        </div>
        <div className="mt-2.5 grid grid-cols-3 gap-2">
          <Button
            type="button"
            variant="secondary"
            className="h-11 rounded-xl text-xs"
            aria-label={paused ? "Pause fortsetzen" : "Pause anhalten"}
            onClick={() =>
              onChange(paused ? resumeRest(rest, Date.now()) : pauseRest(rest, Date.now()))
            }
          >
            {paused ? (
              <>
                <Play className="h-3.5 w-3.5 mr-1" />
                Resume
              </>
            ) : (
              <>
                <Pause className="h-3.5 w-3.5 mr-1" />
                Pause
              </>
            )}
          </Button>
          <Button
            type="button"
            variant="secondary"
            className="h-11 rounded-xl text-xs"
            aria-label="30 Sekunden hinzufügen"
            onClick={() => onChange(addRestSeconds(rest, 30, Date.now()))}
          >
            +30
          </Button>
          <Button
            type="button"
            variant="secondary"
            className="h-11 rounded-xl text-xs"
            aria-label="Pause überspringen"
            onClick={() => onChange(emptyRest())}
          >
            Skip
          </Button>
        </div>
      </div>
    </div>
  );
});

type SessionData = {
  id: string;
  name: string;
  startedAt: string;
  status?: string;
  sets: SetRow[];
  workoutDayId?: string | null;
  workoutPlanId?: string | null;
};

export function LiveWorkout({ sessionId }: { sessionId: string }) {
  const router = useRouter();
  const [session, setSession] = useState<SessionData | null>(null);
  const [previousByExercise, setPreviousByExercise] = useState<Record<string, SetRow[]>>({});
  const [rest, setRest] = useState<LiveRestState>(() => emptyRest());
  const [dialog, setDialog] = useState<"finish" | "leave" | null>(null);
  const [savingFinish, setSavingFinish] = useState(false);
  const [defaultEndName, setDefaultEndName] = useState("Workout 001");
  const [pickerOpen, setPickerOpen] = useState(false);
  const patchTimers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());
  const inflight = useRef(new Set<string>());
  const addingLock = useRef(false);
  const sessionRef = useRef<SessionData | null>(null);
  sessionRef.current = session;

  const applyRest = useCallback(
    (next: LiveRestState) => {
      setRest(next);
      writeLiveRest(sessionId, next);
    },
    [sessionId]
  );

  const load = useCallback(async () => {
    const res = await fetch(`/api/workouts/sessions/${sessionId}`);
    const data = await res.json();
    if (!res.ok) return;
    const remote = data.session as SessionData & { status?: string };
    if (remote.status === "COMPLETED") {
      clearLiveDraft(sessionId);
      router.replace(`/workouts/summary/${sessionId}`);
      return;
    }
    if (remote.status === "CANCELLED") {
      clearLiveDraft(sessionId);
      router.replace("/workouts");
      return;
    }
    setSession((prev) => mergeLiveSession(prev as LiveDraftSession | null, remote));
    setPreviousByExercise(data.previousByExercise ?? {});
  }, [sessionId, router]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const stored = readLiveRest(sessionId);
    if (stored && remainingRestSec(stored, Date.now()) > 0) {
      setRest(stored);
    }
    const draft = readLiveDraft(sessionId);
    const raw = sessionStorage.getItem(PENDING_LIVE_SESSION_KEY);
    if (raw) {
      try {
        const pending = JSON.parse(raw) as SessionData;
        if (pending.id === sessionId) {
          setSession(mergeLiveSession(draft, pending));
          sessionStorage.removeItem(PENDING_LIVE_SESSION_KEY);
        }
      } catch {
        /* ignore */
      }
    } else if (draft?.id === sessionId) {
      setSession(draft);
    }
    load();
  }, [sessionId, load]);

  useEffect(() => {
    if (!session) return;
    const t = setTimeout(() => writeLiveDraft(session), 250);
    return () => clearTimeout(t);
  }, [session]);

  useEffect(() => {
    const onVis = () => {
      if (document.visibilityState !== "visible") return;
      const stored = readLiveRest(sessionId);
      if (stored) setRest(stored);
    };
    document.addEventListener("visibilitychange", onVis);
    window.addEventListener("focus", onVis);
    return () => {
      document.removeEventListener("visibilitychange", onVis);
      window.removeEventListener("focus", onVis);
    };
  }, [sessionId]);

  useEffect(() => {
    const timers = patchTimers.current;
    return () => {
      timers.forEach((t) => clearTimeout(t));
      timers.clear();
    };
  }, []);

  useEffect(() => {
    if (typeof navigator === "undefined" || !("wakeLock" in navigator)) return;
    let sentinel: WakeLockSentinel | null = null;
    const request = async () => {
      try {
        sentinel = await navigator.wakeLock.request("screen");
      } catch {
        /* unsupported / denied */
      }
    };
    void request();
    const onVis = () => {
      if (document.visibilityState === "visible") void request();
    };
    document.addEventListener("visibilitychange", onVis);
    return () => {
      document.removeEventListener("visibilitychange", onVis);
      void sentinel?.release();
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
      muscleGroup: sets[0]?.exercise?.muscleGroup ?? null,
      sets: sets.sort((a, b) => a.setNumber - b.setNumber),
    }));
  }, [session]);

  const completedSets = session?.sets.filter((s) => s.completed).length ?? 0;
  const totalSets = session?.sets.length ?? 0;
  const completedExercises = grouped.filter((g) => g.sets.some((s) => s.completed)).length;
  const totalVolume = useMemo(
    () =>
      session?.sets.reduce(
        (acc, s) => (s.completed ? acc + (s.weightKg ?? 0) * (s.reps ?? 0) : acc),
        0
      ) ?? 0,
    [session]
  );
  const elapsedSec = session
    ? Math.max(0, Math.floor((Date.now() - new Date(session.startedAt).getTime()) / 1000))
    : 0;

  const markSave = useCallback((setId: string, saveState: SaveState) => {
    setSession((s) => {
      if (!s) return s;
      return {
        ...s,
        sets: s.sets.map((row) => (row.id === setId ? { ...row, saveState } : row)),
      };
    });
  }, []);

  const patchSet = useCallback(
    async (setId: string, data: Partial<SetRow>, immediate = false) => {
      setSession((s) => {
        if (!s) return s;
        return {
          ...s,
          sets: s.sets.map((row) =>
            row.id === setId ? { ...row, ...data, saveState: "pending" } : row
          ),
        };
      });

      const send = async () => {
        if (inflight.current.has(setId)) return;
        inflight.current.add(setId);
        try {
          const res = await fetch(`/api/workouts/sessions/${sessionId}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ action: "updateSet", setId, ...data }),
          });
          if (!res.ok) {
            markSave(setId, "error");
            toast.error("Satz nicht gespeichert");
            return;
          }
          markSave(setId, "ok");
        } catch {
          markSave(setId, "error");
          toast.error("Satz nicht gespeichert");
        } finally {
          inflight.current.delete(setId);
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
    [sessionId, markSave]
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
        toast.error("Satz konnte nicht gelöscht werden");
      }
    },
    [sessionId]
  );

  const completeSet = useCallback(
    (row: SetRow) => {
      if (inflight.current.has(row.id)) return;
      const nextCompleted = !row.completed;
      void patchSet(
        row.id,
        {
          completed: nextCompleted,
          weightKg: row.weightKg,
          reps: row.reps,
          rpe: row.rpe,
        },
        true
      );
      if (nextCompleted) {
        hapticTap();
        applyRest(makeRest(row.restSeconds ?? 90, Date.now()));
      }
    },
    [patchSet, applyRest]
  );

  async function addSet(exerciseName: string, exerciseLibraryId: string | null, setNumber?: number) {
    if (addingLock.current) return;
    addingLock.current = true;

    const siblings =
      session?.sets.filter(
        (s) =>
          (exerciseLibraryId && s.exerciseLibraryId === exerciseLibraryId) ||
          s.exerciseName === exerciseName
      ) ?? [];
    const nextNumber = setNumber ?? nextSetNumber(siblings);
    const lastSet = siblings.sort((a, b) => b.setNumber - a.setNumber)[0];

    const tempId = `temp-set-${Date.now()}`;
    const optimistic: SetRow = {
      id: tempId,
      exerciseLibraryId,
      exerciseName,
      setNumber: nextNumber,
      reps: lastSet?.reps ?? null,
      weightKg: lastSet?.weightKg ?? null,
      rpe: null,
      restSeconds: lastSet?.restSeconds ?? 90,
      completed: false,
      notes: null,
      saveState: "pending",
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
          setNumber: nextNumber,
          reps: optimistic.reps ?? undefined,
          weightKg: optimistic.weightKg ?? undefined,
          restSeconds: optimistic.restSeconds ?? 90,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setSession((s) =>
          s
            ? {
                ...s,
                sets: s.sets.map((row) =>
                  row.id === tempId ? { ...row, saveState: "error" as const } : row
                ),
              }
            : s
        );
        toast.error("Satz konnte nicht hinzugefügt werden");
        return;
      }
      const created = data.set as SetRow;
      setSession((s) =>
        s
          ? { ...s, sets: s.sets.map((row) => (row.id === tempId ? { ...created, saveState: "ok" } : row)) }
          : s
      );
    } catch {
      setSession((s) =>
        s
          ? {
              ...s,
              sets: s.sets.map((row) =>
                row.id === tempId ? { ...row, saveState: "error" as const } : row
              ),
            }
          : s
      );
      toast.error("Satz konnte nicht hinzugefügt werden");
    } finally {
      addingLock.current = false;
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
    void addSet(ex.name, ex.id);
  }

  async function saveCompletedWorkout(name: string) {
    if (savingFinish) return;
    setSavingFinish(true);
    hapticSuccess();

    try {
      const res = await fetch(`/api/workouts/sessions/${sessionId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "complete", name }),
      });
      const data = await res.json();
      if (!res.ok) {
        setSavingFinish(false);
        toast.error("Fehler beim Speichern — bitte erneut versuchen");
        return;
      }
      clearLiveRestStorage(sessionId);
      clearLiveDraft(sessionId);
      clearActiveWorkoutCaches({
        name,
        completedAt: new Date().toISOString(),
        workoutDayId: sessionRef.current?.workoutDayId ?? null,
        nextWorkout:
          (data.nextWorkout as HomeDataPayload["nextWorkout"]) ?? null,
      });
      if (!data.alreadyCompleted) bumpWorkoutSeq();
      if (data.newPRs?.length) {
        toast.success(`${data.newPRs.length} neue Personal Records!`, {
          icon: <Trophy className="h-4 w-4" />,
        });
      }
      router.push(`/workouts/summary/${sessionId}`);
    } catch {
      setSavingFinish(false);
      toast.error("Netzwerkfehler beim Speichern");
    }
  }

  function saveAndExit() {
    setDialog(null);
    router.push("/workouts");
  }

  async function discardWorkout() {
    setDialog(null);
    try {
      const res = await fetch(`/api/workouts/sessions/${sessionId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "cancel" }),
      });
      if (!res.ok) {
        toast.error("Workout konnte nicht verworfen werden");
        return;
      }
      clearLiveRestStorage(sessionId);
      clearLiveDraft(sessionId);
      clearActiveWorkoutCaches();
      router.push("/workouts");
    } catch {
      toast.error("Workout konnte nicht verworfen werden");
    }
  }

  if (!session) {
    return (
      <div className="space-y-4 max-w-lg mx-auto">
        <div className="h-28 rounded-2xl bg-zinc-900/80 border border-white/[0.06]" />
        <div className="h-40 rounded-2xl bg-zinc-900/80 border border-white/[0.06]" />
      </div>
    );
  }

  return (
    <>
      <EndWorkoutDialog
        open={dialog != null}
        variant={dialog === "leave" ? "leave" : "finish"}
        defaultName={defaultEndName}
        completedSets={completedSets}
        totalSets={totalSets}
        volumeKg={Math.round(totalVolume)}
        durationSec={elapsedSec}
        exerciseCount={grouped.length}
        saving={savingFinish}
        onFinish={(name) => void saveCompletedWorkout(name)}
        onContinue={() => setDialog(null)}
        onSaveAndExit={saveAndExit}
        onDiscard={() => void discardWorkout()}
      />
    <div className="space-y-4 pb-[calc(10.5rem+env(safe-area-inset-bottom,0px))] max-w-lg lg:max-w-4xl mx-auto keyboard-stable-page">
      <div className="sticky top-0 z-20 py-2 bg-zinc-950/95 backdrop-blur-md border-b border-white/[0.06] -mx-1 px-1">
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            className="h-11 w-11 rounded-xl shrink-0 -ml-1"
            onClick={() => setDialog("leave")}
            aria-label="Zurück zum Training"
          >
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <div className="min-w-0 flex-1">
            <h1 className="text-base font-semibold text-white truncate leading-tight">
              {session.name}
            </h1>
            <LiveElapsedClock startedAt={session.startedAt} />
          </div>
        </div>
        <p className="text-xs text-zinc-500 mt-1.5 tabular-nums px-1">
          {completedExercises} / {grouped.length} Übungen
        </p>
        {remainingRestSec(rest, Date.now()) <= 0 && rest.pausedAt == null && (
          <div className="mt-2 grid grid-cols-3 gap-2 px-1">
            {[60, 90, 120].map((sec) => (
              <Button
                key={sec}
                type="button"
                variant="secondary"
                className="h-11 rounded-xl text-xs"
                aria-label={`${sec} Sekunden Pause starten`}
                onClick={() => applyRest(makeRest(sec, Date.now()))}
              >
                {sec}s
              </Button>
            ))}
          </div>
        )}
      </div>
      <LiveRestTimer rest={rest} onChange={applyRest} />

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

      <div className="lg:grid lg:grid-cols-2 lg:gap-4 space-y-4 lg:space-y-0">
      {grouped.map(({ key, name, exerciseLibraryId, muscleGroup, sets }) => {
        const history = previousByExercise[key] ?? [];
        const lastLine = formatLastPerformance(history);
        const newPr = isNewWeightPr(sets, history);

        return (
          <div key={key} className="rounded-2xl border border-white/[0.08] bg-zinc-900/60 overflow-hidden">
            <div className="px-4 py-3.5 border-b border-white/[0.06]">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  {exerciseLibraryId ? (
                    <Link
                      href={`/workouts/exercises/${exerciseLibraryId}`}
                      className="text-lg font-semibold text-white uppercase tracking-wide"
                    >
                      {name}
                    </Link>
                  ) : (
                    <h2 className="text-lg font-semibold text-white uppercase tracking-wide">
                      {name}
                    </h2>
                  )}
                  {muscleGroup && (
                    <p className="text-xs text-zinc-500 mt-0.5">{muscleGroup}</p>
                  )}
                </div>
                {newPr && (
                  <span className="shrink-0 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-emerald-300">
                    New PR
                  </span>
                )}
              </div>
              {lastLine ? (
                <p className="mt-1.5 text-xs text-zinc-300 tabular-nums">Last: {lastLine}</p>
              ) : (
                <p className="mt-1 text-xs text-zinc-600">Noch keine Daten</p>
              )}
            </div>
            <div className="p-3 space-y-1">
              <div className="grid grid-cols-[2.5rem_minmax(0,1fr)_minmax(0,1.1fr)_2.75rem] gap-2 text-[10px] uppercase tracking-wide text-zinc-500 px-1.5">
                <span>Set</span>
                <span>Reps</span>
                <span>KG</span>
                <span className="text-center">✓</span>
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
                  onRetry={(row) =>
                    void patchSet(
                      row.id,
                      {
                        completed: row.completed,
                        weightKg: row.weightKg,
                        reps: row.reps,
                        rpe: row.rpe,
                      },
                      true
                    )
                  }
                />
              ))}
              <Button
                variant="outline"
                className="w-full h-11 mt-1 rounded-xl border-dashed border-zinc-700"
                onClick={() => void addSet(name, exerciseLibraryId)}
              >
                <Plus className="h-4 w-4 mr-2" />
                Satz hinzufügen
              </Button>
            </div>
          </div>
        );
      })}
      </div>

      <div className="fixed bottom-0 left-0 right-0 z-40 border-t border-white/[0.08] bg-zinc-950/95 backdrop-blur-md safe-area-pb">
        <div className="max-w-lg lg:max-w-4xl mx-auto px-4 pt-3 pb-3 space-y-2">
          <Button
            className="w-full h-12 min-h-12 rounded-2xl text-base font-semibold shadow-lg shadow-accent/20 lg:h-11"
            onClick={() => {
              setDefaultEndName(session.name || nextDefaultWorkoutName());
              setDialog("finish");
            }}
          >
            Fertig
          </Button>
          <Button
            variant="outline"
            className="w-full h-11 rounded-2xl border-dashed border-white/15 text-zinc-300"
            onClick={() => setPickerOpen(true)}
          >
            <Plus className="h-4 w-4 mr-2" />
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
