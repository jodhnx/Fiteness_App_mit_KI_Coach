"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { WorkoutNav } from "@/components/workout/workout-nav";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { parsePlanSetTargets } from "@/lib/plan-exercise-sets";
import {
  Archive,
  ArchiveRestore,
  ChevronRight,
  Clock,
  Copy,
  Dumbbell,
  Layers,
  Play,
  Plus,
  Trash2,
} from "lucide-react";

type PlanExercise = {
  targetSets: number;
  targetReps: string;
  setTargets?: unknown;
};

type PlanDay = {
  id: string;
  name: string;
  exercises: PlanExercise[];
};

type Plan = {
  id: string;
  name: string;
  description: string | null;
  template: string;
  days: PlanDay[];
};

function planStats(days: PlanDay[]) {
  let exercises = 0;
  let sets = 0;
  for (const day of days) {
    exercises += day.exercises.length;
    for (const ex of day.exercises) {
      sets += parsePlanSetTargets(ex.setTargets, ex.targetSets, ex.targetReps).length;
    }
  }
  const estMinutes = Math.max(15, sets * 2 + exercises * 2);
  return { exercises, sets, estMinutes };
}

export default function MyPlansPage() {
  const router = useRouter();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [showArchived, setShowArchived] = useState(false);

  function load() {
    fetch(`/api/workouts/plans?archived=${showArchived ? "1" : "0"}`)
      .then((r) => r.json())
      .then((d) => setPlans(d.plans ?? []));
  }

  useEffect(() => {
    load();
  }, [showArchived]);

  async function duplicate(id: string) {
    const res = await fetch(`/api/workouts/plans/${id}/duplicate`, { method: "POST" });
    if (!res.ok) {
      toast.error("Duplizieren fehlgeschlagen");
      return;
    }
    toast.success("Plan dupliziert");
    load();
  }

  async function archive(id: string) {
    await fetch(`/api/workouts/plans/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ archive: true }),
    });
    toast.success("Archiviert");
    load();
  }

  async function unarchive(id: string) {
    await fetch(`/api/workouts/plans/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ unarchive: true }),
    });
    toast.success("Wiederhergestellt");
    load();
  }

  async function remove(id: string) {
    if (!confirm("Plan endgültig löschen?")) return;
    await fetch(`/api/workouts/plans/${id}`, { method: "DELETE" });
    toast.success("Gelöscht");
    load();
  }

  async function quickStart(planId: string, dayId: string, name: string) {
    const res = await fetch("/api/workouts/sessions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "start", workoutPlanId: planId, workoutDayId: dayId, name }),
    });
    const data = await res.json();
    if (res.ok) router.push(`/workouts/live/${data.session.id}`);
  }

  return (
    <div className="space-y-6 pb-24 max-w-xl mx-auto">
      <div className="flex flex-wrap justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Meine Workouts</h1>
          <p className="text-zinc-400 text-sm">Starten, bearbeiten, archivieren</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setShowArchived(!showArchived)}>
            {showArchived ? "Aktive" : "Archiv"}
          </Button>
          <Link href="/workouts/create">
            <Button size="sm">
              <Plus className="h-4 w-4 mr-1" /> Workout erstellen
            </Button>
          </Link>
        </div>
      </div>
      <WorkoutNav />

      <div className="grid gap-4">
        {plans.map((plan) => {
          const stats = planStats(plan.days);
          return (
            <Card key={plan.id} className="rounded-2xl border-zinc-800 hover:border-cyan-500/30 transition-colors">
              <CardHeader className="pb-2">
                <div className="flex justify-between items-start gap-2">
                  <div className="min-w-0">
                    <CardTitle className="text-lg truncate">{plan.name}</CardTitle>
                    <CardDescription className="truncate">
                      {plan.description || plan.template}
                    </CardDescription>
                  </div>
                  <div className="flex gap-0.5 shrink-0">
                    <Button variant="ghost" size="icon" onClick={() => duplicate(plan.id)} title="Duplizieren">
                      <Copy className="h-4 w-4" />
                    </Button>
                    {!showArchived ? (
                      <Button variant="ghost" size="icon" onClick={() => archive(plan.id)} title="Archivieren">
                        <Archive className="h-4 w-4" />
                      </Button>
                    ) : (
                      <Button variant="ghost" size="icon" onClick={() => unarchive(plan.id)}>
                        <ArchiveRestore className="h-4 w-4" />
                      </Button>
                    )}
                    <Button variant="ghost" size="icon" onClick={() => remove(plan.id)}>
                      <Trash2 className="h-4 w-4 text-red-400" />
                    </Button>
                    <Link href={`/workouts/plans/${plan.id}`}>
                      <Button variant="ghost" size="icon">
                        <ChevronRight className="h-5 w-5" />
                      </Button>
                    </Link>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="rounded-xl bg-zinc-900/60 py-2 px-1">
                    <Dumbbell className="h-4 w-4 mx-auto text-zinc-500 mb-1" />
                    <p className="text-sm font-bold text-white tabular-nums">{stats.exercises}</p>
                    <p className="text-[10px] text-zinc-500">Übungen</p>
                  </div>
                  <div className="rounded-xl bg-zinc-900/60 py-2 px-1">
                    <Layers className="h-4 w-4 mx-auto text-zinc-500 mb-1" />
                    <p className="text-sm font-bold text-white tabular-nums">{stats.sets}</p>
                    <p className="text-[10px] text-zinc-500">Sätze</p>
                  </div>
                  <div className="rounded-xl bg-zinc-900/60 py-2 px-1">
                    <Clock className="h-4 w-4 mx-auto text-zinc-500 mb-1" />
                    <p className="text-sm font-bold text-white tabular-nums">{stats.estMinutes}m</p>
                    <p className="text-[10px] text-zinc-500">ca. Dauer</p>
                  </div>
                </div>

                {plan.days.map((day) => (
                  <div
                    key={day.id}
                    className="flex items-center justify-between rounded-xl bg-white/5 px-3 py-2.5"
                  >
                    <div>
                      <p className="font-medium text-white">{day.name}</p>
                      <p className="text-xs text-zinc-500">{day.exercises.length} Übungen</p>
                    </div>
                    {!showArchived && (
                      <Button
                        size="sm"
                        className="rounded-xl h-10"
                        onClick={() =>
                          quickStart(plan.id, day.id, `${plan.name} – ${day.name}`)
                        }
                      >
                        <Play className="h-4 w-4 mr-1" /> Start
                      </Button>
                    )}
                  </div>
                ))}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {plans.length === 0 && (
        <Card className="rounded-2xl">
          <CardContent className="py-12 text-center text-zinc-500">
            {showArchived ? "Keine archivierten Workouts." : "Noch keine Workouts."}
            <div className="mt-4 flex flex-col gap-2 items-center">
              <Link href="/workouts/create">
                <Button className="rounded-xl">+ Workout erstellen</Button>
              </Link>
              <Link href="/workouts/catalog">
                <Button variant="outline" className="rounded-xl">Aus Bibliothek wählen</Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
