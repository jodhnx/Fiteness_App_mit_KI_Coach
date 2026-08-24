"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { useCachedFetch } from "@/hooks/use-cached-fetch";
import { getPlanRecoveryMessage, type MuscleRecovery } from "@/lib/recovery-shared";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Play, Plus } from "lucide-react";
import { WorkoutBackLink } from "@/components/workout/workout-back-link";
import { PlanScoreCard } from "@/components/workout/plan-score-card";
import { PlanStatsBar } from "@/components/workout/plan-stats-bar";
import { defaultPlanSets, type PlanSetTarget } from "@/lib/plan-exercise-sets";
import type { PlanScores } from "@/lib/plan-science-engine";
import type { LibraryExercise } from "@/hooks/use-exercise-library-search";
import { getCached } from "@/lib/client-cache";
import { HOME_DATA_CACHE_KEY, HOME_DATA_EVENT } from "@/lib/nutrition-sync";
import type { HomeDataPayload } from "@/lib/home-defaults";

const PlanDaySortableList = dynamic(
  () =>
    import("@/components/workout/plan-exercise-sets-card").then(
      (m) => m.PlanDaySortableList
    ),
  { loading: () => <div className="h-40 rounded-2xl bg-zinc-900/60 animate-pulse" /> }
);

const ExercisePickerSheet = dynamic(
  () =>
    import("@/components/workout/exercise-picker-sheet").then(
      (m) => m.ExercisePickerSheet
    ),
  { ssr: false }
);

type PlanExercise = {
  id: string;
  orderIndex: number;
  targetSets: number;
  targetReps: string;
  restSeconds: number;
  setTargets?: unknown;
  exercise: { id: string; name: string; muscleGroup: string };
};

type PlanDay = {
  id: string;
  name: string;
  description: string | null;
  dayOrder: number;
  exercises: PlanExercise[];
};

type DayStats = {
  lastSessionAt: string;
  volumeKg: number;
  durationSec: number;
};

function recoveryMusclesFromHome(home: HomeDataPayload | null): MuscleRecovery[] {
  return (home?.recovery?.muscles ?? []) as MuscleRecovery[];
}

function moveItem<T>(items: T[], from: number, to: number): T[] {
  if (from === to || from < 0 || to < 0) return items;
  const next = items.slice();
  const [item] = next.splice(from, 1);
  if (!item) return items;
  next.splice(to, 0, item);
  return next;
}

export default function PlanEditorPage() {
  const params = useParams();
  const router = useRouter();
  const planId = params.id as string;
  const cacheKey = `workout-plan-${planId}`;

  const { data: planPayload, loading: planLoading } = useCachedFetch<{
    plan: { id: string; name: string; description: string | null; days: PlanDay[] };
    dayStats?: Record<string, DayStats>;
  }>(cacheKey, `/api/workouts/plans/${planId}`, 120_000, 8000, {
    revalidateOnMount: true,
    staleRatio: 0.85,
  });

  const [plan, setPlan] = useState<{
    id: string;
    name: string;
    description: string | null;
    days: PlanDay[];
  } | null>(null);
  const [dayStats, setDayStats] = useState<Record<string, DayStats>>({});
  const [activeDayId, setActiveDayId] = useState<string | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [replaceTargetId, setReplaceTargetId] = useState<string | null>(null);
  const [alternatives, setAlternatives] = useState<{ id: string; name: string }[]>([]);
  const [planScores, setPlanScores] = useState<PlanScores | null>(null);
  const [addingIds, setAddingIds] = useState<Set<string>>(new Set());
  const [recoveryMuscles, setRecoveryMuscles] = useState<MuscleRecovery[]>(() =>
    recoveryMusclesFromHome(
      getCached<HomeDataPayload>(HOME_DATA_CACHE_KEY, { allowStale: true })
    )
  );

  useEffect(() => {
    if (planPayload?.plan) {
      setPlan(planPayload.plan);
      setDayStats(planPayload.dayStats ?? {});
      setActiveDayId((current) => {
        if (current && planPayload.plan.days.some((d) => d.id === current)) return current;
        return planPayload.plan.days[0]?.id ?? null;
      });
    }
  }, [planPayload]);

  useEffect(() => {
    const onHome = (e: Event) => {
      const detail = (e as CustomEvent<HomeDataPayload>).detail;
      if (detail) setRecoveryMuscles(recoveryMusclesFromHome(detail));
    };
    window.addEventListener(HOME_DATA_EVENT, onHome);
    return () => window.removeEventListener(HOME_DATA_EVENT, onHome);
  }, []);

  const dayCount = plan?.days.length ?? 0;

  useEffect(() => {
    if (dayCount <= 1) {
      setPlanScores(null);
      return;
    }
    let cancelled = false;
    fetch(`/api/workouts/plans/${planId}/score`)
      .then((r) => r.json())
      .then((d) => {
        if (!cancelled) setPlanScores(d.scores ?? null);
      })
      .catch(() => {
        if (!cancelled) setPlanScores(null);
      });
    return () => {
      cancelled = true;
    };
  }, [planId, dayCount]);

  const recoveryHint = useMemo(() => {
    if (!plan?.days?.length || recoveryMuscles.length === 0) return null;
    const muscles = [
      ...new Set(plan.days.flatMap((d) => d.exercises.map((e) => e.exercise.muscleGroup))),
    ];
    return getPlanRecoveryMessage(muscles, recoveryMuscles);
  }, [plan, recoveryMuscles]);

  const activeDay = plan?.days.find((d) => d.id === activeDayId);
  const activeDayStats = activeDayId ? dayStats[activeDayId] : undefined;

  const excludeExerciseIds = useMemo(
    () => activeDay?.exercises.map((e) => e.exercise.id) ?? [],
    [activeDay]
  );

  async function savePlanMeta() {
    if (!plan) return;
    await fetch(`/api/workouts/plans/${planId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: plan.name, description: plan.description }),
    });
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
  }

  async function openReplace(workoutExerciseId: string, exerciseLibraryId: string) {
    setReplaceTargetId(workoutExerciseId);
    setPickerOpen(true);
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
    const res = await fetch(`/api/workouts/plans/${planId}/exercises`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "replace",
        workoutExerciseId: replaceTargetId,
        newExerciseLibraryId,
      }),
    });
    if (!res.ok) {
      toast.error("Ersetzen fehlgeschlagen");
      return;
    }
    const data = await res.json();
    const saved = data.exercise as PlanExercise;
    setPlan((p) => {
      if (!p) return p;
      return {
        ...p,
        days: p.days.map((d) => ({
          ...d,
          exercises: d.exercises.map((e) => (e.id === replaceTargetId ? saved : e)),
        })),
      };
    });
    setReplaceTargetId(null);
    setAlternatives([]);
    setPickerOpen(false);
  }

  async function saveOrder(exercises: PlanExercise[]) {
    await fetch(`/api/workouts/plans/${planId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        reorderExercises: exercises.map((e, i) => ({ id: e.id, orderIndex: i })),
      }),
    });
  }

  function onReorder(activeId: string, overId: string) {
    if (!activeDay) return;
    const oldIndex = activeDay.exercises.findIndex((e) => e.id === activeId);
    const newIndex = activeDay.exercises.findIndex((e) => e.id === overId);
    const reordered = moveItem(activeDay.exercises, oldIndex, newIndex);
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

  const addExercise = useCallback(
    async (picked: LibraryExercise) => {
      if (!activeDayId || !plan) {
        toast.error("Kein Trainingstag aktiv");
        return;
      }
      if (excludeExerciseIds.includes(picked.id)) {
        toast.error("Übung ist bereits im Workout");
        return;
      }
      if (addingIds.has(picked.id)) return;

      const defaultSets = defaultPlanSets();
      const tempId = `temp-${picked.id}-${Date.now()}`;
      const optimistic: PlanExercise = {
        id: tempId,
        orderIndex: activeDay?.exercises.length ?? 0,
        targetSets: defaultSets.length,
        targetReps: "8-12",
        restSeconds: 90,
        setTargets: defaultSets,
        exercise: {
          id: picked.id,
          name: picked.name,
          muscleGroup: picked.muscleGroup,
        },
      };

      setAddingIds((s) => new Set(s).add(picked.id));
      setPlan((p) =>
        p
          ? {
              ...p,
              days: p.days.map((d) =>
                d.id === activeDayId
                  ? { ...d, exercises: [...d.exercises, optimistic] }
                  : d
              ),
            }
          : p
      );
      setPickerOpen(false);

      const res = await fetch(`/api/workouts/plans/${planId}/exercises`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          workoutDayId: activeDayId,
          exerciseLibraryId: picked.id,
          targetSets: defaultSets.length,
          setTargets: defaultSets,
        }),
      });
      const data = await res.json();
      setAddingIds((s) => {
        const next = new Set(s);
        next.delete(picked.id);
        return next;
      });

      if (!res.ok) {
        setPlan((p) =>
          p
            ? {
                ...p,
                days: p.days.map((d) =>
                  d.id === activeDayId
                    ? { ...d, exercises: d.exercises.filter((e) => e.id !== tempId) }
                    : d
                ),
              }
            : p
        );
        toast.error(data.error ?? "Übung konnte nicht hinzugefügt werden");
        return;
      }

      const ex = data.exercise as PlanExercise;
      setPlan((p) =>
        p
          ? {
              ...p,
              days: p.days.map((d) =>
                d.id === activeDayId
                  ? {
                      ...d,
                      exercises: d.exercises.map((e) => (e.id === tempId ? ex : e)),
                    }
                  : d
              ),
            }
          : p
      );
    },
    [activeDayId, activeDay, plan, planId, excludeExerciseIds, addingIds]
  );

  async function saveExerciseSets(workoutExerciseId: string, setTargets: PlanSetTarget[]) {
    setPlan((p) => {
      if (!p) return p;
      return {
        ...p,
        days: p.days.map((d) => ({
          ...d,
          exercises: d.exercises.map((e) =>
            e.id === workoutExerciseId
              ? { ...e, setTargets, targetSets: setTargets.length }
              : e
          ),
        })),
      };
    });

    const res = await fetch(`/api/workouts/plans/${planId}/exercises`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        workoutExerciseId,
        setTargets,
        targetSets: setTargets.length,
      }),
    });
    if (!res.ok) toast.error("Sätze konnten nicht gespeichert werden");
  }

  async function removeExercise(exerciseId: string) {
    const snapshot = plan;
    setPlan((p) => {
      if (!p) return p;
      return {
        ...p,
        days: p.days.map((d) => ({
          ...d,
          exercises: d.exercises.filter((e) => e.id !== exerciseId),
        })),
      };
    });
    const res = await fetch(
      `/api/workouts/plans/${planId}/exercises?exerciseId=${exerciseId}`,
      { method: "DELETE" }
    );
    if (!res.ok) {
      setPlan(snapshot);
      toast.error("Löschen fehlgeschlagen");
    }
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

  function handlePickerPick(exercise: LibraryExercise) {
    if (replaceTargetId) {
      void replaceExercise(exercise.id);
      return;
    }
    void addExercise(exercise);
  }

  if (planLoading && !plan) {
    return (
      <div className="space-y-4 animate-pulse max-w-xl">
        <div className="h-8 bg-zinc-800 rounded-xl w-1/3" />
        <div className="h-14 bg-zinc-800 rounded-2xl" />
        <div className="grid grid-cols-2 gap-2">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-20 bg-zinc-800 rounded-2xl" />
          ))}
        </div>
      </div>
    );
  }

  if (!plan) return <p className="text-zinc-500">Plan nicht gefunden</p>;

  return (
    <div className="space-y-5 pb-24 max-w-xl mx-auto">
      <WorkoutBackLink href="/workouts/my-plans" label="Meine Pläne" />

      {recoveryHint && (
        <div className="rounded-2xl p-3 border border-emerald-500/20 bg-emerald-500/5">
          <p className="text-sm text-emerald-200/90">{recoveryHint}</p>
        </div>
      )}

      <Input
        value={plan.name}
        onChange={(e) => setPlan({ ...plan, name: e.target.value })}
        onBlur={savePlanMeta}
        className="text-2xl font-bold h-14 rounded-2xl border-zinc-800 bg-zinc-900/60"
      />

      {plan.days.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-1">
          {plan.days.map((d) => (
            <Button
              key={d.id}
              variant={activeDayId === d.id ? "default" : "secondary"}
              size="sm"
              className="rounded-full shrink-0"
              onClick={() => setActiveDayId(d.id)}
            >
              {d.name}
            </Button>
          ))}
        </div>
      )}

      {activeDay && (
        <>
          <PlanStatsBar
            exercises={activeDay.exercises}
            lastSessionAt={activeDayStats?.lastSessionAt}
            lastVolumeKg={activeDayStats?.volumeKg}
          />

          {plan.days.length === 1 && (
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
              className="rounded-2xl"
            />
          )}

          <div className="flex gap-2">
            <Button
              className="flex-1 h-14 text-base rounded-2xl"
              onClick={() => setPickerOpen(true)}
            >
              <Plus className="h-5 w-5 mr-2" />
              Übung hinzufügen
            </Button>
            <Button
              variant="secondary"
              className="h-14 px-5 rounded-2xl"
              onClick={startDay}
              disabled={activeDay.exercises.length === 0}
            >
              <Play className="h-5 w-5" />
            </Button>
          </div>

          {planScores && plan.days.length > 1 && (
            <PlanScoreCard scores={planScores} />
          )}

          <PlanDaySortableList
            exercises={activeDay.exercises.map((ex) => ({
              id: ex.id,
              name: ex.exercise.name,
              muscleGroup: ex.exercise.muscleGroup,
              targetSets: ex.targetSets,
              targetReps: ex.targetReps,
              setTargets: ex.setTargets,
              libraryId: ex.exercise.id,
            }))}
            onReorder={onReorder}
            onRemove={removeExercise}
            onReplace={openReplace}
            onSaveSets={saveExerciseSets}
          />
        </>
      )}

      {replaceTargetId && alternatives.length > 0 && (
        <Card className="border-cyan-500/30">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-cyan-400">Alternativen</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1">
            {alternatives.map((alt) => (
              <button
                key={alt.id}
                type="button"
                className="w-full text-left text-sm text-white hover:bg-white/5 px-3 py-2 rounded-xl"
                onClick={() => replaceExercise(alt.id)}
              >
                {alt.name}
              </button>
            ))}
          </CardContent>
        </Card>
      )}

      {(pickerOpen || replaceTargetId) && (
        <ExercisePickerSheet
          open={pickerOpen}
          onClose={() => {
            setPickerOpen(false);
            setReplaceTargetId(null);
            setAlternatives([]);
          }}
          onPick={handlePickerPick}
          excludeIds={replaceTargetId ? [] : excludeExerciseIds}
        />
      )}
    </div>
  );
}
