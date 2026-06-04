"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { WorkoutNav } from "@/components/workout/workout-nav";
import { PlanScoreCard } from "@/components/workout/plan-score-card";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dumbbell, FlaskConical, Sparkles, Target } from "lucide-react";
import type { PlanScores } from "@/lib/plan-science-engine";

const GOALS = [
  { id: "MUSCLE_GAIN", label: "Muskelaufbau" },
  { id: "STRENGTH_GAIN", label: "Kraftaufbau" },
  { id: "FAT_LOSS", label: "Fettabbau" },
  { id: "RECOMP", label: "Recomp" },
  { id: "GENERAL_FITNESS", label: "Allgemeine Fitness" },
];

const LEVELS = [
  { id: "BEGINNER", label: "Beginner" },
  { id: "INTERMEDIATE", label: "Intermediate" },
  { id: "ADVANCED", label: "Advanced" },
  { id: "PRO", label: "Pro" },
];

const MUSCLES = [
  { id: "CHEST", label: "Brust" },
  { id: "BACK", label: "Rücken" },
  { id: "SHOULDERS", label: "Schultern" },
  { id: "LEGS", label: "Beine" },
  { id: "BICEPS", label: "Bizeps" },
  { id: "TRICEPS", label: "Trizeps" },
];

type RecPlan = {
  catalogKey: string;
  name: string;
  description: string;
  daysPerWeek: number;
  durationMinutes: number;
  scienceBased: boolean;
  rank: number;
  scores: PlanScores;
};

export default function PlanCatalogPage() {
  const [plans, setPlans] = useState<RecPlan[]>([]);
  const [goal, setGoal] = useState("MUSCLE_GAIN");
  const [level, setLevel] = useState("INTERMEDIATE");
  const [days, setDays] = useState(4);
  const [duration, setDuration] = useState(60);
  const [equipment, setEquipment] = useState("GYM");
  const [efficiency, setEfficiency] = useState("SCIENCE_OPTIMIZED");
  const [priorityMuscles, setPriorityMuscles] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    const q = new URLSearchParams({
      recommend: "1",
      goal,
      level,
      daysPerWeek: String(days),
      durationMinutes: String(duration),
      equipment,
      efficiency,
    });
    if (priorityMuscles.length) q.set("priorityMuscles", priorityMuscles.join(","));
    fetch(`/api/workouts/catalog?${q}`)
      .then((r) => r.json())
      .then((d) => setPlans(d.plans ?? []))
      .finally(() => setLoading(false));
  }, [goal, level, days, duration, equipment, efficiency, priorityMuscles]);

  useEffect(() => {
    load();
  }, [load]);

  function toggleMuscle(id: string) {
    setPriorityMuscles((prev) =>
      prev.includes(id) ? prev.filter((m) => m !== id) : [...prev, id]
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-white flex items-center gap-2">
          <Dumbbell className="text-cyan-400" /> Evidenzbasierte Plan-Bibliothek
        </h1>
        <p className="text-zinc-400">
          Empfehlungen nach Israetel/Nippard/RP – kein Bro-Split bei Hypertrophie-Effizienz
        </p>
      </div>
      <WorkoutNav />

      <Card className="border-cyan-500/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Target className="h-4 w-4 text-cyan-400" /> Wissenschaftliches Empfehlungssystem
          </CardTitle>
          <CardDescription>
            Pläne werden nach Split-Typ, Frequenz, Volumen und Regeneration bewertet (0–100).
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <p className="text-xs text-zinc-500 mb-2">Ziel</p>
            <div className="flex flex-wrap gap-2">
              {GOALS.map((g) => (
                <Button
                  key={g.id}
                  size="sm"
                  variant={goal === g.id ? "default" : "outline"}
                  onClick={() => setGoal(g.id)}
                >
                  {g.label}
                </Button>
              ))}
            </div>
          </div>
          <div>
            <p className="text-xs text-zinc-500 mb-2">Level</p>
            <div className="flex flex-wrap gap-2">
              {LEVELS.map((l) => (
                <Button
                  key={l.id}
                  size="sm"
                  variant={level === l.id ? "default" : "outline"}
                  onClick={() => setLevel(l.id)}
                >
                  {l.label}
                </Button>
              ))}
            </div>
          </div>
          <div>
            <p className="text-xs text-zinc-500 mb-2">Prioritäts-Muskelgruppen (optional)</p>
            <div className="flex flex-wrap gap-2">
              {MUSCLES.map((m) => (
                <Button
                  key={m.id}
                  size="sm"
                  variant={priorityMuscles.includes(m.id) ? "default" : "outline"}
                  onClick={() => toggleMuscle(m.id)}
                >
                  {m.label}
                </Button>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div>
              <p className="text-xs text-zinc-500 mb-1">Tage/Woche</p>
              <select
                className="w-full rounded-lg bg-zinc-900 border border-zinc-700 px-3 py-2 text-sm"
                value={days}
                onChange={(e) => setDays(Number(e.target.value))}
              >
                {[1, 2, 3, 4, 5, 6, 7].map((d) => (
                  <option key={d} value={d}>
                    {d} Tage
                  </option>
                ))}
              </select>
            </div>
            <div>
              <p className="text-xs text-zinc-500 mb-1">Dauer</p>
              <select
                className="w-full rounded-lg bg-zinc-900 border border-zinc-700 px-3 py-2 text-sm"
                value={duration}
                onChange={(e) => setDuration(Number(e.target.value))}
              >
                {[30, 45, 60, 75, 90].map((d) => (
                  <option key={d} value={d}>
                    {d} Min
                  </option>
                ))}
              </select>
            </div>
            <div>
              <p className="text-xs text-zinc-500 mb-1">Equipment</p>
              <select
                className="w-full rounded-lg bg-zinc-900 border border-zinc-700 px-3 py-2 text-sm"
                value={equipment}
                onChange={(e) => setEquipment(e.target.value)}
              >
                <option value="GYM">Gym</option>
                <option value="HOME_GYM">Home Gym</option>
                <option value="DUMBBELLS_ONLY">Kurzhanteln</option>
                <option value="CALISTHENICS">Calisthenics</option>
              </select>
            </div>
            <div>
              <p className="text-xs text-zinc-500 mb-1">Effizienz</p>
              <select
                className="w-full rounded-lg bg-zinc-900 border border-zinc-700 px-3 py-2 text-sm"
                value={efficiency}
                onChange={(e) => setEfficiency(e.target.value)}
              >
                <option value="MAX_EFFICIENCY">Maximale Effizienz</option>
                <option value="TIME_OPTIMIZED">Zeitoptimiert</option>
                <option value="SCIENCE_OPTIMIZED">Wissenschaftlich</option>
              </select>
            </div>
          </div>
          <Button onClick={load} disabled={loading}>
            {loading ? "Berechne..." : "Empfehlungen aktualisieren"}
          </Button>
        </CardContent>
      </Card>

      <div className="space-y-4">
        {plans.map((plan) => (
          <Card
            key={plan.catalogKey}
            className={`hover:border-cyan-500/40 transition-all ${
              plan.rank === 1 ? "border-emerald-500/40 bg-emerald-500/5" : ""
            }`}
          >
            <CardHeader>
              <div className="flex justify-between gap-2 flex-wrap">
                <div>
                  <CardTitle className="text-lg flex items-center gap-2">
                    #{plan.rank} {plan.name}
                    {plan.scienceBased && (
                      <FlaskConical className="h-4 w-4 text-violet-400" />
                    )}
                  </CardTitle>
                  <CardDescription>{plan.description}</CardDescription>
                </div>
                <span className="text-2xl font-bold text-cyan-400">
                  {plan.scores.totalScore}
                </span>
              </div>
            </CardHeader>
            <CardContent className="grid gap-4 lg:grid-cols-2">
              <PlanScoreCard scores={plan.scores} />
              <div className="flex flex-col justify-end gap-2">
                <p className="text-sm text-zinc-500">
                  {plan.daysPerWeek}T · {plan.durationMinutes} Min · Split:{" "}
                  {plan.scores.splitType}
                </p>
                <Link href={`/workouts/catalog/${plan.catalogKey}`}>
                  <Button className="w-full">Ansehen & übernehmen</Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {plans.length === 0 && !loading && (
        <p className="text-center text-zinc-500">Keine passenden Pläne – Filter anpassen.</p>
      )}

      <Card className="border-cyan-500/20 bg-cyan-500/5">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="text-cyan-400" /> KI Plan (Science Engine)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Link href="/workouts/generator">
            <Button>Individuellen Plan generieren</Button>
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
