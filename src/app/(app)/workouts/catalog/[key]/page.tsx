"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { WorkoutNav } from "@/components/workout/workout-nav";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { ArrowLeft, Clock, Target, TrendingUp } from "lucide-react";
import { GOAL_LABELS, LEVEL_LABELS, EFFICIENCY_LABELS } from "@/lib/plan-catalog";
import { PlanScoreCard } from "@/components/workout/plan-score-card";
import type { PlanScores } from "@/lib/plan-science-engine";

type PreviewPlan = {
  catalogKey: string;
  name: string;
  description: string;
  goal: keyof typeof GOAL_LABELS;
  level: keyof typeof LEVEL_LABELS;
  efficiency: keyof typeof EFFICIENCY_LABELS;
  daysPerWeek: number;
  durationMinutes: number;
  scienceBased: boolean;
  totalExercises: number;
  scores?: PlanScores;
  days: {
    name: string;
    description?: string;
    exerciseCount: number;
    exercises: { name: string; muscleGroup: string; difficulty: string; equipment: string }[];
  }[];
};

export default function PlanPreviewPage() {
  const params = useParams();
  const router = useRouter();
  const key = params.key as string;
  const [plan, setPlan] = useState<PreviewPlan | null>(null);
  const [adopting, setAdopting] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams({ key });
    fetch(`/api/workouts/catalog?${params}`)
      .then((r) => r.json())
      .then((d) => setPlan(d.plan));
  }, [key]);

  async function adopt() {
    setAdopting(true);
    const res = await fetch("/api/workouts/plans/adopt", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ catalogKey: key }),
    });
    setAdopting(false);
    if (!res.ok) {
      toast.error("Übernahme fehlgeschlagen");
      return;
    }
    const data = await res.json();
    toast.success("Plan zu „Meine Pläne“ hinzugefügt");
    router.push(`/workouts/plans/${data.plan.id}`);
  }

  if (!plan) {
    return <p className="text-zinc-500 animate-pulse">Plan wird geladen...</p>;
  }

  return (
    <div className="space-y-6">
      <Link href="/workouts/catalog" className="text-zinc-400 hover:text-white flex items-center gap-1 text-sm">
        <ArrowLeft className="h-4 w-4" /> Bibliothek
      </Link>
      <WorkoutNav />

      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white">{plan.name}</h1>
          <p className="text-zinc-400 mt-1">{plan.description}</p>
        </div>
        <Button size="lg" onClick={adopt} disabled={adopting}>
          {adopting ? "Wird übernommen..." : "In Meine Pläne übernehmen"}
        </Button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="pt-4 flex items-center gap-2">
            <Target className="text-cyan-400 h-5 w-5" />
            <div>
              <p className="text-xs text-zinc-500">Ziel</p>
              <p className="font-medium">{GOAL_LABELS[plan.goal]}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 flex items-center gap-2">
            <TrendingUp className="text-violet-400 h-5 w-5" />
            <div>
              <p className="text-xs text-zinc-500">Level</p>
              <p className="font-medium">{LEVEL_LABELS[plan.level]}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 flex items-center gap-2">
            <Clock className="text-amber-400 h-5 w-5" />
            <div>
              <p className="text-xs text-zinc-500">Dauer</p>
              <p className="font-medium">{plan.durationMinutes} Min · {plan.daysPerWeek}T/Woche</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-xs text-zinc-500">Effizienz</p>
            <p className="font-medium">{EFFICIENCY_LABELS[plan.efficiency]}</p>
          </CardContent>
        </Card>
      </div>

      <p className="text-sm text-zinc-500">
        {plan.days.length} Trainingstage · {plan.totalExercises} Übungen
        {plan.scienceBased && " · Evidenzbasiert"}
      </p>

      {plan.scores && <PlanScoreCard scores={plan.scores} />}

      {plan.days.map((day) => (
        <Card key={day.name}>
          <CardHeader>
            <CardTitle>{day.name}</CardTitle>
            {day.description && (
              <p className="text-sm text-zinc-400">{day.description}</p>
            )}
            <p className="text-sm text-zinc-500">{day.exerciseCount} Übungen</p>
          </CardHeader>
          <CardContent className="space-y-2">
            {day.exercises.map((ex) => (
              <div
                key={ex.name}
                className="flex justify-between items-center rounded-lg bg-white/5 px-3 py-2 text-sm"
              >
                <span className="text-white">{ex.name}</span>
                <span className="text-zinc-500 text-xs">
                  {ex.muscleGroup} · {ex.difficulty}
                </span>
              </div>
            ))}
            {day.exercises.length === 0 && (
              <p className="text-zinc-600 text-sm">Übungen werden beim Übernehmen aus der DB geladen.</p>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
