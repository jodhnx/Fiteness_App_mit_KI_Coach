"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useCachedFetch } from "@/hooks/use-cached-fetch";
import { useExerciseLibrarySearch } from "@/hooks/use-exercise-library-search";
import { getPlanRecoveryMessage, type MuscleRecovery } from "@/lib/recovery-shared";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Play, Plus, ArrowLeft } from "lucide-react";
import { WorkoutNav } from "@/components/workout/workout-nav";
import { PlanScoreCard } from "@/components/workout/plan-score-card";
import { PlanExerciseSetsCard, createDefaultSetTargets } from "@/components/workout/plan-exercise-sets-card";
import type { PlanScores } from "@/lib/plan-science-engine";
import type { PlanSetTarget } from "@/lib/plan-exercise-sets";

type PlanExercise = {
  id: string;
  orderIndex: number;
  targetSets: number;
  targetReps: string;
  restSeconds: number;
  setTargets?: unknown;
  exercise: { id: string; name: string; muscleGroup: string };
};

const MUSCLE_OPTIONS = [
  "CHEST",
  "BACK",
  "SHOULDERS",
  "BICEPS",
  "TRICEPS",
  "LEGS",
  "ABS",
  "FOREARMS",
  "CALVES",
  "CARDIO",
] as const;

const EQUIPMENT_OPTIONS = [
  "BARBELL",
  "DUMBBELL",
  "MACHINE",
  "CABLE",
  "BODYWEIGHT",
  "KETTLEBELL",
  "BAND",
  "SMITH_MACHINE",
  "OTHER",
  "NONE",
] as const;

type PlanDay = {
  id: string;
  name: string;
  description: string | null;
  dayOrder: number;
  exercises: PlanExercise[];
};

export default function PlanEditorPage() {
  const params = useParams();
  const router = useRouter();
  const planId = params.id as string;
  const [plan, setPlan] = useState<{
    id: string;
    name: string;
    description: string | null;
    days: PlanDay[];
  } | null>(null);
  const [search, setSearch] = useState("");
  const [muscleFilter, setMuscleFilter] = useState("");
  const [equipmentFilter, setEquipmentFilter] = useState("");
  const [difficultyFilter, setDifficultyFilter] = useState("");
  const [showCustomExercise, setShowCustomExercise] = useState(false);
  const [customName, setCustomName] = useState("");
  const [customMuscle, setCustomMuscle] = useState<string>("CHEST");
  const {
    exercises: library,
    loading: libraryLoading,
    error: libraryError,
    total: libraryTotal,
    libraryCount,
    seeding: librarySeeding,
  } = useExerciseLibrarySearch(search, {
    muscle: muscleFilter,
    equipment: equipmentFilter,
    difficulty: difficultyFilter,
  });
  const [activeDayId, setActiveDayId] = useState<string | null>(null);
  const [replaceTargetId, setReplaceTargetId] = useState<string | null>(null);
  const [alternatives, setAlternatives] = useState<{ id: string; name: string }[]>([]);
  const [planScores, setPlanScores] = useState<PlanScores | null>(null);
  const [dayCountSetup, setDayCountSetup] = useState(3);
  const [setupDays, setSetupDays] = useState<{ name: string; description: string }[]>([]);
  const [showSetup, setShowSetup] = useState(false);

  const { data: recoveryData } = useCachedFetch<{
    recovery: MuscleRecovery[];
  }>("workouts-recovery", "/api/workouts/recovery", 60_000);

  const recoveryHint = useMemo(() => {
    if (!plan?.days?.length || !recoveryData?.recovery?.length) return null;
    const muscles = [
      ...new Set(
        plan.days.flatMap((d) => d.exercises.map((e) => e.exercise.muscleGroup))
      ),
    ];
    return getPlanRecoveryMessage(muscles, recoveryData.recovery);
  }, [plan, recoveryData]);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const load = useCallback(async () => {
    const res = await fetch(`/api/workouts/plans/${planId}`);
    const data = await res.json();
    if (res.ok && data.plan) {
      setPlan(data.plan);
      setActiveDayId((current) => {
        if (current && data.plan.days.some((d: PlanDay) => d.id === current)) return current;
        return data.plan.days[0]?.id ?? null;
      });
    } else if (!res.ok) {
      toast.error(data.error ?? "Plan konnte nicht geladen werden");
    }
    fetch(`/api/workouts/plans/${planId}/score`)
      .then((r) => r.json())
      .then((d) => setPlanScores(d.scores ?? null));
  }, [planId]);

  useEffect(() => {
    load();
  }, [load]);

  async function savePlanMeta() {
    if (!plan) return;
    await fetch(`/api/workouts/plans/${planId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: plan.name, description: plan.description }),
    });
    toast.success("Gespeichert");
  }

  async function saveActiveDayMeta() {
    if (!activeDay) return;
    await fetch(`/api/workouts/plans/${planId}/days`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        dayId: activeDay.id,
        name: activeDay.name,
        description: activeDay.description,
      }),
    });
    toast.success("Trainingstag gespeichert");
  }

  async function addDay() {
    if ((plan?.days.length ?? 0) >= 7) {
      toast.error("Maximal 7 Trainingstage");
      return;
    }
    const name = `Tag ${(plan?.days.length ?? 0) + 1}`;
    await fetch(`/api/workouts/plans/${planId}/days`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, description: "" }),
    });
    load();
  }

  async function removeDay(dayId: string) {
    if (!confirm("Trainingstag und alle Übungen löschen?")) return;
    await fetch(`/api/workouts/plans/${planId}/days?dayId=${dayId}`, { method: "DELETE" });
    if (activeDayId === dayId) setActiveDayId(null);
    load();
  }

  function initSetupDays(count: number) {
    const presets: Record<number, { name: string; description: string }[]> = {
      3: [
        { name: "Push", description: "Brust, Schultern, Trizeps" },
        { name: "Pull", description: "Rücken, Bizeps" },
        { name: "Legs", description: "Beine, Gesäß" },
      ],
      4: [
        { name: "Upper A", description: "Oberkörper – Schwer" },
        { name: "Lower A", description: "Unterkörper – Schwer" },
        { name: "Upper B", description: "Oberkörper – Volumen" },
        { name: "Lower B", description: "Unterkörper – Volumen" },
      ],
    };
    const base =
      presets[count] ??
      Array.from({ length: count }, (_, i) => ({
        name: `Tag ${i + 1}`,
        description: "",
      }));
    setSetupDays(base);
    setDayCountSetup(count);
  }

  async function applyDaySetup() {
    const res = await fetch(`/api/workouts/plans/${planId}/days`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "setup", days: setupDays }),
    });
    const data = await res.json();
    if (!res.ok) {
      toast.error(data.error ?? "Trainingstage konnten nicht erstellt werden");
      return;
    }
    setShowSetup(false);
    if (data.days?.[0]?.id) setActiveDayId(data.days[0].id);
    toast.success(`${setupDays.length} Trainingstage erstellt`);
    load();
  }

  async function openReplace(workoutExerciseId: string, exerciseLibraryId: string) {
    setReplaceTargetId(workoutExerciseId);
    const res = await fetch("/api/exercises/alternatives", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ exerciseLibraryId }),
    });
    const data = await res.json();
    setAlternatives(data.alternatives ?? []);
  }

  async function replaceExercise(newExerciseLibraryId: string) {
    if (!replaceTargetId) return;
    await fetch(`/api/workouts/plans/${planId}/exercises`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "replace",
        workoutExerciseId: replaceTargetId,
        newExerciseLibraryId,
      }),
    });
    setReplaceTargetId(null);
    setAlternatives([]);
    toast.success("Übung ersetzt");
    load();
  }

  const activeDay = plan?.days.find((d) => d.id === activeDayId);

  async function saveOrder(exercises: PlanExercise[]) {
    await fetch(`/api/workouts/plans/${planId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        reorderExercises: exercises.map((e, i) => ({ id: e.id, orderIndex: i })),
      }),
    });
  }

  function onDragEnd(event: DragEndEvent) {
    if (!activeDay) return;
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = activeDay.exercises.findIndex((e) => e.id === active.id);
    const newIndex = activeDay.exercises.findIndex((e) => e.id === over.id);
    const reordered = arrayMove(activeDay.exercises, oldIndex, newIndex);
    setPlan((p) =>
      p
        ? {
            ...p,
            days: p.days.map((d) =>
              d.id === activeDayId ? { ...d, exercises: reordered } : d
            ),
          }
        : p
    );
    saveOrder(reordered);
  }

  async function addExercise(exerciseLibraryId: string) {
    if (!activeDayId) {
      toast.error("Bitte zuerst einen Trainingstag auswählen");
      return;
    }
    const defaultSets = createDefaultSetTargets();
    const res = await fetch(`/api/workouts/plans/${planId}/exercises`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        workoutDayId: activeDayId,
        exerciseLibraryId,
        targetSets: defaultSets.length,
        setTargets: defaultSets,
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      toast.error(data.error ?? "Übung konnte nicht hinzugefügt werden");
      return;
    }
    if (data.exercise && plan) {
      const ex = data.exercise as PlanExercise;
      setPlan((p) =>
        p
          ? {
              ...p,
              days: p.days.map((d) =>
                d.id === activeDayId ? { ...d, exercises: [...d.exercises, ex] } : d
              ),
            }
          : p
      );
    } else {
      load();
    }
    toast.success("Übung hinzugefügt");
  }

  async function saveExerciseSets(workoutExerciseId: string, setTargets: PlanSetTarget[]) {
    const res = await fetch(`/api/workouts/plans/${planId}/exercises`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        workoutExerciseId,
        setTargets,
        targetSets: setTargets.length,
      }),
    });
    if (!res.ok) {
      toast.error("Sätze konnten nicht gespeichert werden");
      return;
    }
    const data = await res.json();
    const saved = data.exercise as PlanExercise | undefined;
    setPlan((p) => {
      if (!p) return p;
      return {
        ...p,
        days: p.days.map((d) => ({
          ...d,
          exercises: d.exercises.map((e) =>
            e.id === workoutExerciseId
              ? {
                  ...e,
                  setTargets: saved?.setTargets ?? setTargets,
                  targetSets: setTargets.length,
                  targetReps: saved?.targetReps ?? e.targetReps,
                }
              : e
          ),
        })),
      };
    });
  }

  async function createCustomExercise() {
    if (!customName.trim()) {
      toast.error("Name eingeben");
      return;
    }
    const res = await fetch("/api/exercises", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: customName.trim(),
        muscleGroup: customMuscle,
        equipment: equipmentFilter || "OTHER",
        difficulty: difficultyFilter || "INTERMEDIATE",
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      toast.error(data.error ?? "Eigene Übung konnte nicht erstellt werden");
      return;
    }
    setShowCustomExercise(false);
    setCustomName("");
    await addExercise(data.exercise.id);
  }

  async function removeExercise(exerciseId: string) {
    await fetch(`/api/workouts/plans/${planId}/exercises?exerciseId=${exerciseId}`, {
      method: "DELETE",
    });
    load();
  }

  async function startDay() {
    if (!plan || !activeDay) return;
    const res = await fetch("/api/workouts/sessions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "start",
        workoutPlanId: plan.id,
        workoutDayId: activeDay.id,
        name: `${plan.name} – ${activeDay.name}`,
      }),
    });
    const data = await res.json();
    if (res.ok) router.push(`/workouts/live/${data.session.id}`);
  }

  if (!plan) return <p className="text-zinc-500">Lädt...</p>;

  return (
    <div className="space-y-6">
      <Link href="/workouts/my-plans" className="text-cyan-400 text-sm flex items-center gap-1">
        <ArrowLeft className="h-4 w-4" /> Meine Pläne
      </Link>
      <WorkoutNav />
      {recoveryHint && (
        <div className="card-premium p-3 border-emerald-500/20 bg-emerald-500/5 max-w-xl">
          <p className="text-sm text-emerald-200/90">{recoveryHint}</p>
        </div>
      )}
      <div className="space-y-2 max-w-xl">
        <Input
          value={plan.name}
          onChange={(e) => setPlan({ ...plan, name: e.target.value })}
          onBlur={savePlanMeta}
          className="text-xl font-bold"
        />
        <Input
          placeholder="Beschreibung..."
          value={plan.description ?? ""}
          onChange={(e) => setPlan({ ...plan, description: e.target.value })}
          onBlur={savePlanMeta}
        />
      </div>
      <div className="grid gap-4 lg:grid-cols-3">
        {planScores && (
          <div className="lg:col-span-1">
            <PlanScoreCard scores={planScores} />
          </div>
        )}
        <Card className={planScores ? "lg:col-span-2" : "lg:col-span-3"}>
          <CardHeader>
            <CardTitle>Trainingstage ({plan.days.length}/7)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" size="sm" onClick={() => { initSetupDays(3); setShowSetup(true); }}>
                PPL (3)
              </Button>
              <Button variant="outline" size="sm" onClick={() => { initSetupDays(4); setShowSetup(true); }}>
                Upper/Lower (4)
              </Button>
              <Button variant="outline" size="sm" onClick={addDay} disabled={plan.days.length >= 7}>
                <Plus className="h-4 w-4 mr-1" /> Tag
              </Button>
            </div>
            {showSetup && (
              <div className="rounded-lg border border-cyan-500/30 p-3 space-y-2">
                <p className="text-sm text-cyan-400">Struktur: {setupDays.length} Tage</p>
                {setupDays.map((d, i) => (
                  <div key={i} className="grid gap-2 sm:grid-cols-2">
                    <Input
                      value={d.name}
                      onChange={(e) => {
                        const next = [...setupDays];
                        next[i] = { ...next[i], name: e.target.value };
                        setSetupDays(next);
                      }}
                      placeholder="Name"
                    />
                    <Input
                      value={d.description}
                      onChange={(e) => {
                        const next = [...setupDays];
                        next[i] = { ...next[i], description: e.target.value };
                        setSetupDays(next);
                      }}
                      placeholder="Beschreibung"
                    />
                  </div>
                ))}
                <div className="flex gap-2">
                  <Button size="sm" onClick={applyDaySetup}>Übernehmen</Button>
                  <Button size="sm" variant="ghost" onClick={() => setShowSetup(false)}>Abbrechen</Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-wrap justify-between gap-4 items-center">
        <div className="flex gap-2 overflow-x-auto flex-1">
          {plan.days.map((d) => (
            <div key={d.id} className="flex items-center gap-1">
              <Button
                variant={activeDayId === d.id ? "default" : "secondary"}
                size="sm"
                onClick={() => setActiveDayId(d.id)}
              >
                {d.name}
              </Button>
              {plan.days.length > 1 && (
                <button
                  type="button"
                  className="text-zinc-600 hover:text-red-400 text-xs px-1"
                  onClick={() => removeDay(d.id)}
                >
                  ×
                </button>
              )}
            </div>
          ))}
        </div>
        {activeDay && (
          <Button onClick={startDay}>
            <Play className="h-4 w-4 mr-2" /> {activeDay.name} starten
          </Button>
        )}
      </div>

      {activeDay && (
        <div className="grid gap-2 sm:grid-cols-2 max-w-2xl">
          <Input
            value={activeDay.name}
            onChange={(e) =>
              setPlan((p) =>
                p
                  ? {
                      ...p,
                      days: p.days.map((d) =>
                        d.id === activeDayId ? { ...d, name: e.target.value } : d
                      ),
                    }
                  : p
              )
            }
            onBlur={saveActiveDayMeta}
            placeholder="Tag-Name"
          />
          <Input
            value={activeDay.description ?? ""}
            onChange={(e) =>
              setPlan((p) =>
                p
                  ? {
                      ...p,
                      days: p.days.map((d) =>
                        d.id === activeDayId ? { ...d, description: e.target.value } : d
                      ),
                    }
                  : p
              )
            }
            onBlur={saveActiveDayMeta}
            placeholder="Beschreibung dieses Tags"
          />
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Übungen – {activeDay?.name}</CardTitle>
          </CardHeader>
          <CardContent>
            {activeDay && (
              <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
                <SortableContext
                  items={activeDay.exercises.map((e) => e.id)}
                  strategy={verticalListSortingStrategy}
                >
                  {activeDay.exercises.map((ex) => (
                    <PlanExerciseSetsCard
                      key={ex.id}
                      id={ex.id}
                      name={ex.exercise.name}
                      muscleGroup={ex.exercise.muscleGroup}
                      targetSets={ex.targetSets}
                      targetReps={ex.targetReps}
                      setTargets={ex.setTargets}
                      onRemove={() => removeExercise(ex.id)}
                      onReplace={() => openReplace(ex.id, ex.exercise.id)}
                      onSaveSets={(sets) => saveExerciseSets(ex.id, sets)}
                    />
                  ))}
                </SortableContext>
              </DndContext>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Übung hinzufügen</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 max-h-[28rem] overflow-y-auto">
            {!activeDayId && (
              <p className="text-sm text-amber-400">Wähle oben einen Trainingstag, um Übungen hinzuzufügen.</p>
            )}
            <Input
              placeholder="Name, Muskel, Equipment…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <div className="grid grid-cols-3 gap-2">
              <select
                className="rounded-lg bg-zinc-900 border border-zinc-700 px-2 py-2 text-xs"
                value={muscleFilter}
                onChange={(e) => setMuscleFilter(e.target.value)}
              >
                <option value="">Muskel</option>
                {MUSCLE_OPTIONS.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
              <select
                className="rounded-lg bg-zinc-900 border border-zinc-700 px-2 py-2 text-xs"
                value={equipmentFilter}
                onChange={(e) => setEquipmentFilter(e.target.value)}
              >
                <option value="">Equipment</option>
                {EQUIPMENT_OPTIONS.map((e) => (
                  <option key={e} value={e}>
                    {e}
                  </option>
                ))}
              </select>
              <select
                className="rounded-lg bg-zinc-900 border border-zinc-700 px-2 py-2 text-xs"
                value={difficultyFilter}
                onChange={(e) => setDifficultyFilter(e.target.value)}
              >
                <option value="">Level</option>
                <option value="BEGINNER">Anfänger</option>
                <option value="INTERMEDIATE">Mittel</option>
                <option value="ADVANCED">Pro</option>
              </select>
            </div>
            <p className="text-xs text-zinc-500">
              {libraryLoading || librarySeeding
                ? librarySeeding
                  ? "Übungsbibliothek wird initialisiert…"
                  : "Suche…"
                : libraryError
                  ? libraryError
                  : `${libraryTotal} Treffer · ${libraryCount} Übungen in Bibliothek`}
            </p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="w-full"
              onClick={() => setShowCustomExercise((v) => !v)}
            >
              Eigene Übung erstellen
            </Button>
            {showCustomExercise && (
              <div className="rounded-lg border border-zinc-700 p-2 space-y-2">
                <Input
                  placeholder="Übungsname"
                  value={customName}
                  onChange={(e) => setCustomName(e.target.value)}
                />
                <select
                  className="w-full rounded-lg bg-zinc-900 border border-zinc-700 px-3 py-2 text-sm"
                  value={customMuscle}
                  onChange={(e) => setCustomMuscle(e.target.value)}
                >
                  {MUSCLE_OPTIONS.map((m) => (
                    <option key={m} value={m}>
                      {m}
                    </option>
                  ))}
                </select>
                <Button type="button" size="sm" onClick={createCustomExercise}>
                  Erstellen & hinzufügen
                </Button>
              </div>
            )}
            {replaceTargetId && alternatives.length > 0 && (
              <div className="rounded-lg border border-cyan-500/30 p-2 space-y-1">
                <p className="text-xs text-cyan-400">KI / Alternativen</p>
                {alternatives.map((alt) => (
                  <button
                    key={alt.id}
                    type="button"
                    className="w-full text-left text-sm text-white hover:bg-white/5 px-2 py-1 rounded"
                    onClick={() => replaceExercise(alt.id)}
                  >
                    {alt.name}
                  </button>
                ))}
                <Button variant="ghost" size="sm" onClick={() => setReplaceTargetId(null)}>
                  Abbrechen
                </Button>
              </div>
            )}
            {!libraryLoading && !librarySeeding && library.length === 0 && !libraryError && (
              <p className="text-sm text-zinc-500 py-4 text-center">
                Keine Übungen für diese Suche. Filter zurücksetzen oder anderen Begriff eingeben.
              </p>
            )}
            {library.map((ex) => (
              <button
                key={ex.id}
                type="button"
                className="w-full flex items-center justify-between rounded-lg bg-white/5 px-3 py-2 text-left hover:bg-cyan-500/10"
                onClick={() =>
                  replaceTargetId ? replaceExercise(ex.id) : addExercise(ex.id)
                }
              >
                <div>
                  <span className="text-sm text-white">{ex.name}</span>
                  <p className="text-xs text-zinc-500">
                    {ex.muscleGroup} · {ex.difficulty} · ★
                    {ex.ratingAvg?.toFixed(1) ?? "—"} · {ex.popularity}×
                  </p>
                </div>
                <Plus className="h-4 w-4 text-cyan-400 shrink-0" />
              </button>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
