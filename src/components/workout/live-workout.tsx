"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Check, Copy, Plus, Timer, Trash2, Trophy } from "lucide-react";

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
  const [expandedNotes, setExpandedNotes] = useState<string | null>(null);

  const load = useCallback(async () => {
    const res = await fetch(`/api/workouts/sessions/${sessionId}`);
    const data = await res.json();
    if (res.ok) {
      setSession(data.session);
      setPreviousByExercise(data.previousByExercise ?? {});
    }
  }, [sessionId]);

  useEffect(() => {
    load();
  }, [load]);

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

  async function patchSet(setId: string, data: Partial<SetRow>) {
    const prev = session;
    setSession((s) => {
      if (!s) return s;
      return {
        ...s,
        sets: s.sets.map((row) => (row.id === setId ? { ...row, ...data } : row)),
      };
    });
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
  }

  async function deleteSet(setId: string) {
    await fetch(`/api/workouts/sessions/${sessionId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "deleteSet", setId }),
    });
    await load();
  }

  async function addSet(exerciseName: string, exerciseLibraryId: string | null, setNumber: number) {
    const lastSet = session?.sets
      .filter((s) => s.exerciseName === exerciseName)
      .sort((a, b) => b.setNumber - a.setNumber)[0];
    await fetch(`/api/workouts/sessions/${sessionId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "addSet",
        exerciseName,
        exerciseLibraryId: exerciseLibraryId ?? undefined,
        setNumber,
        reps: lastSet?.reps ?? 10,
        weightKg: lastSet?.weightKg ?? 0,
        restSeconds: lastSet?.restSeconds ?? 90,
      }),
    });
    await load();
  }

  async function copyLastSet(exerciseName: string, exerciseLibraryId: string | null) {
    const sets = session?.sets.filter((s) => s.exerciseName === exerciseName) ?? [];
    const last = sets[sets.length - 1];
    if (!last) return;
    await addSet(exerciseName, exerciseLibraryId, sets.length + 1);
    const newSets = session?.sets.filter((s) => s.exerciseName === exerciseName) ?? [];
    const newId = newSets[newSets.length - 1]?.id;
    if (newId) {
      await patchSet(newId, {
        reps: last.reps ?? 0,
        weightKg: last.weightKg ?? 0,
        rpe: last.rpe ?? undefined,
      } as Partial<SetRow>);
    }
  }

  async function completeWorkout() {
    const res = await fetch(`/api/workouts/sessions/${sessionId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "complete" }),
    });
    const data = await res.json();
    if (!res.ok) {
      toast.error("Fehler beim Abschließen");
      return;
    }
    if (data.newPRs?.length) {
      toast.success(`${data.newPRs.length} neue Personal Records!`, {
        icon: <Trophy className="h-4 w-4" />,
      });
    } else {
      toast.success("Training gespeichert! +50 XP");
    }
    router.push(`/workouts/summary/${sessionId}`);
    router.refresh();
  }

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec.toString().padStart(2, "0")}`;
  };

  if (!session) {
    return <p className="text-zinc-500 animate-pulse">Workout wird geladen...</p>;
  }

  return (
    <div className="space-y-4 pb-28">
      <div className="sticky top-0 z-20 -mx-1 px-1 py-3 bg-zinc-950/95 backdrop-blur-md border-b border-zinc-800/50">
        <div className="card-premium p-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-lg font-bold text-white">{session.name}</h1>
            <p className="text-3xl font-bold text-cyan-400 font-mono tabular-nums">
              {formatTime(elapsed)}
            </p>
            <p className="text-xs text-zinc-500">
              Sätze {completedSets}/{totalSets}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {restLeft > 0 && (
              <div className="flex items-center gap-2 rounded-xl bg-cyan-500/20 border border-cyan-500/40 px-4 py-2">
                <Timer className="h-5 w-5 text-cyan-400" />
                <span className="text-xl font-bold text-cyan-400 tabular-nums">
                  {formatTime(restLeft)}
                </span>
              </div>
            )}
            <Button
              variant="secondary"
              className="h-11"
              onClick={() => setRestLeft(90)}
            >
              90s Pause
            </Button>
            <Button className="h-11" onClick={completeWorkout}>
              Beenden
            </Button>
          </div>
        </div>
      </div>

      {grouped.map(({ key, name, exerciseLibraryId, sets }) => {
        const prev = previousByExercise[key]?.[0];
        return (
          <div key={key} className="card-premium overflow-hidden">
            <div className="p-4 border-b border-zinc-800/80 flex justify-between items-start gap-2">
              <h2 className="text-lg font-bold text-white">{name}</h2>
              {prev && (
                <p className="text-xs text-zinc-500 shrink-0">
                  Letzte: {prev.weightKg ?? 0} kg × {prev.reps ?? 0}
                </p>
              )}
            </div>
            <div className="p-3 space-y-2">
              <div className="grid grid-cols-[2.5rem_1fr_1fr_3rem_3rem] gap-2 text-xs text-zinc-500 px-1">
                <span>#</span>
                <span>kg</span>
                <span>Wdh</span>
                <span className="text-center">✓</span>
                <span></span>
              </div>
              {sets.map((set) => (
                <div key={set.id} className="space-y-1">
                  <div
                    className={`grid grid-cols-[2.5rem_1fr_1fr_3rem_3rem] gap-2 items-center rounded-xl p-2 ${
                      set.completed
                        ? "bg-cyan-500/15 border border-cyan-500/40"
                        : "bg-zinc-800/40"
                    }`}
                  >
                    <span className="text-zinc-400 text-center font-medium">
                      {set.setNumber}
                    </span>
                    <Input
                      type="number"
                      className="h-12 text-lg text-center"
                      value={set.weightKg ?? ""}
                      onChange={(e) =>
                        setSession((prev) => {
                          if (!prev) return prev;
                          return {
                            ...prev,
                            sets: prev.sets.map((s) =>
                              s.id === set.id
                                ? { ...s, weightKg: Number(e.target.value) }
                                : s
                            ),
                          };
                        })
                      }
                      onBlur={() => patchSet(set.id, { weightKg: set.weightKg ?? 0 })}
                    />
                    <Input
                      type="number"
                      className="h-12 text-lg text-center"
                      value={set.reps ?? ""}
                      onChange={(e) =>
                        setSession((prev) => {
                          if (!prev) return prev;
                          return {
                            ...prev,
                            sets: prev.sets.map((s) =>
                              s.id === set.id ? { ...s, reps: Number(e.target.value) } : s
                            ),
                          };
                        })
                      }
                      onBlur={() => patchSet(set.id, { reps: set.reps ?? 0 })}
                    />
                    <Button
                      size="icon"
                      variant={set.completed ? "default" : "secondary"}
                      className="h-12 w-12 rounded-xl"
                      onClick={async () => {
                        await patchSet(set.id, { completed: !set.completed });
                        if (!set.completed) setRestLeft(set.restSeconds ?? 90);
                      }}
                    >
                      <Check className="h-6 w-6" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-12 w-12"
                      onClick={() => deleteSet(set.id)}
                    >
                      <Trash2 className="h-5 w-5 text-red-400" />
                    </Button>
                  </div>
                  {expandedNotes === set.id && (
                    <Input
                      placeholder="Notiz zum Satz..."
                      defaultValue={set.notes ?? ""}
                      onBlur={(e) => patchSet(set.id, { notes: e.target.value })}
                      className="text-sm"
                    />
                  )}
                </div>
              ))}
              <div className="flex flex-wrap gap-2 pt-1">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() =>
                    addSet(name, exerciseLibraryId, sets.length + 1)
                  }
                >
                  <Plus className="h-4 w-4 mr-1" /> Satz
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => copyLastSet(name, exerciseLibraryId)}
                >
                  <Copy className="h-4 w-4 mr-1" /> Kopieren
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() =>
                    setExpandedNotes(expandedNotes === sets[0]?.id ? null : sets[0]?.id ?? null)
                  }
                >
                  Notiz
                </Button>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
