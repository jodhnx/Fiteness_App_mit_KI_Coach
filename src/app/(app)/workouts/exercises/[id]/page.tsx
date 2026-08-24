"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { WorkoutNav } from "@/components/workout/workout-nav";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LazyStatChart } from "@/components/charts/lazy-stat-chart";
import { ArrowLeft } from "lucide-react";
import { ExerciseVisual } from "@/components/workout/exercise-visual";

export default function ExerciseStatsPage() {
  const params = useParams();
  const id = params.id as string;
  const [data, setData] = useState<{
    exercise: {
      name: string;
      muscleGroup: string;
      equipment: string;
      difficulty: string;
      imageUrl: string | null;
    };
    frequency: number;
    totalSets: number;
    bestWeight: number | null;
    bestVolume: number | null;
    estimated1RM: number | null;
    lastPerformance: {
      weightKg: number | null;
      reps: number | null;
      completedAt: string | null;
    } | null;
    progressChart: { label: string; volume: number; maxWeight: number }[];
    ratingAvg: number | null;
    ratingCount: number;
    popularity: number;
  } | null>(null);

  useEffect(() => {
    fetch(`/api/exercises/${id}/stats`).then((r) => r.json()).then(setData);
  }, [id]);

  if (!data?.exercise) {
    return <p className="text-zinc-500 animate-pulse">Lädt...</p>;
  }

  const chartData = data.progressChart.map((p) => ({
    label: p.label,
    value: p.volume,
  }));

  return (
    <div className="space-y-6">
      <Link href="/workouts/exercises" className="text-cyan-400 text-sm flex items-center gap-1">
        <ArrowLeft className="h-4 w-4" /> Übungen
      </Link>
      <WorkoutNav />
      <ExerciseVisual
        name={data.exercise.name}
        muscleGroup={data.exercise.muscleGroup}
        imageUrl={data.exercise.imageUrl}
        equipment={data.exercise.equipment}
      />
      <h1 className="text-2xl font-bold text-white">{data.exercise.name}</h1>
      <p className="text-sm text-zinc-400">
        {data.exercise.muscleGroup} · {data.exercise.equipment}
      </p>

      {(data.lastPerformance || data.estimated1RM != null) && (
        <div className="rounded-2xl border border-white/[0.08] bg-zinc-900/70 px-4 py-3 space-y-1">
          {data.lastPerformance && (
            <p className="text-sm text-zinc-200 tabular-nums">
              Letztes Mal: {data.lastPerformance.weightKg ?? "—"} kg ×{" "}
              {data.lastPerformance.reps ?? "—"}
            </p>
          )}
          {data.estimated1RM != null && (
            <p className="text-sm text-zinc-400 tabular-nums">
              Geschätztes 1RM: {Math.round(data.estimated1RM)} kg
            </p>
          )}
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="pt-4">
            <p className="text-xs text-zinc-500">Bestes Gewicht</p>
            <p className="text-xl font-bold">{data.bestWeight ?? "—"} kg</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-xs text-zinc-500">Bestes Volumen</p>
            <p className="text-xl font-bold">{data.bestVolume ?? "—"}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-xs text-zinc-500">Häufigkeit (90T)</p>
            <p className="text-xl font-bold">{data.frequency}×</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-xs text-zinc-500">Bewertung · Beliebtheit</p>
            <p className="text-xl font-bold">
              {data.ratingAvg?.toFixed(1) ?? "—"} · {data.popularity}
            </p>
          </CardContent>
        </Card>
      </div>

      {chartData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Fortschritt (Volumen/Woche)</CardTitle>
          </CardHeader>
          <CardContent>
            <LazyStatChart data={chartData} />
          </CardContent>
        </Card>
      )}

      <p className="text-sm text-zinc-500">{data.totalSets} abgeschlossene Sätze in 90 Tagen</p>
    </div>
  );
}
