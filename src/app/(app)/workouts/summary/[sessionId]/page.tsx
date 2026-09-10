"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { formatWorkoutClock } from "@/lib/workout-input";

type Analysis = {
  totalVolumeKg: number;
  completedSets: number;
  totalSets: number;
  durationSec: number;
  muscleVolume: { label: string; volume: number }[];
  newPRs: { exercise: { name: string }; recordType: string; value: number }[];
};

type SessionInfo = {
  name?: string;
  caloriesBurned?: number | null;
  sets?: { exerciseLibraryId?: string | null; exerciseName?: string | null }[];
};

export default function WorkoutSummaryPage() {
  const params = useParams();
  const sessionId = params.sessionId as string;
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [session, setSession] = useState<SessionInfo | null>(null);

  useEffect(() => {
    fetch(`/api/workouts/sessions/${sessionId}/summary`)
      .then((r) => r.json())
      .then((d) => {
        setAnalysis(d.analysis);
        setSession(d.session ?? null);
      });
  }, [sessionId]);

  if (!analysis) {
    return (
      <div className="space-y-4 max-w-lg mx-auto py-6">
        <div className="h-28 rounded-2xl bg-zinc-900/80 border border-white/[0.06]" />
        <div className="grid grid-cols-2 gap-3">
          <div className="h-24 rounded-2xl bg-zinc-900/80 border border-white/[0.06]" />
          <div className="h-24 rounded-2xl bg-zinc-900/80 border border-white/[0.06]" />
        </div>
      </div>
    );
  }

  const calories =
    typeof session?.caloriesBurned === "number" && session.caloriesBurned > 0
      ? session.caloriesBurned
      : null;
  const exerciseCount = new Set(
    (session?.sets ?? []).map((s) => s.exerciseLibraryId || s.exerciseName || "")
  ).size;
  const prCount = analysis.newPRs.length;

  return (
    <div className="space-y-6 max-w-lg mx-auto pb-28">
      <div>
        <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-zinc-500">
          Workout
        </p>
        <h1 className="text-2xl font-semibold text-white mt-1">
          {session?.name ?? "Training"}
        </h1>
      </div>

      <div className="rounded-2xl border border-white/[0.08] bg-zinc-900/60 px-5 py-6 text-center">
        <p className="text-4xl font-semibold text-white tabular-nums tracking-tight">
          {formatWorkoutClock(analysis.durationSec)}
        </p>
        <p className="text-sm text-zinc-500 mt-1">Workout Duration</p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-2xl border border-white/[0.08] bg-zinc-900/60 px-4 py-4">
          <p className="text-2xl font-semibold text-white tabular-nums">{analysis.completedSets}</p>
          <p className="text-xs text-zinc-500 mt-1">Sets</p>
        </div>
        <div className="rounded-2xl border border-white/[0.08] bg-zinc-900/60 px-4 py-4">
          <p className="text-2xl font-semibold text-white tabular-nums">
            {analysis.totalVolumeKg.toLocaleString("de-DE")} KG
          </p>
          <p className="text-xs text-zinc-500 mt-1">Volume</p>
        </div>
        <div className="rounded-2xl border border-white/[0.08] bg-zinc-900/60 px-4 py-4">
          <p className="text-2xl font-semibold text-white tabular-nums">
            {exerciseCount}
          </p>
          <p className="text-xs text-zinc-500 mt-1">Exercises</p>
        </div>
        <div className="rounded-2xl border border-white/[0.08] bg-zinc-900/60 px-4 py-4">
          <p className="text-2xl font-semibold text-white tabular-nums">{prCount}</p>
          <p className="text-xs text-zinc-500 mt-1">PRs</p>
        </div>
      </div>

      {calories != null && (
        <div className="rounded-2xl border border-white/[0.08] bg-zinc-900/60 px-4 py-4">
          <p className="text-2xl font-semibold text-white tabular-nums">
            {Math.round(calories).toLocaleString("de-DE")}
          </p>
          <p className="text-xs text-zinc-500 mt-1">Calories</p>
        </div>
      )}

      {analysis.newPRs.length > 0 && (
        <div className="rounded-2xl border border-white/[0.08] bg-zinc-900/60 px-4 py-4 space-y-2">
          {analysis.newPRs.map((pr, i) => (
            <div key={`${pr.exercise?.name}-${pr.recordType}-${i}`} className="flex items-center justify-between gap-3">
              <p className="text-sm text-zinc-300 truncate">{pr.exercise?.name ?? "Übung"}</p>
              <span className="shrink-0 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-300">
                New PR
              </span>
            </div>
          ))}
        </div>
      )}

      {analysis.muscleVolume.length > 0 && (
        <div className="rounded-2xl border border-white/[0.08] bg-zinc-900/60 px-4 py-4 space-y-2">
          {analysis.muscleVolume.map((m) => (
            <div key={m.label} className="flex justify-between text-sm">
              <span className="text-zinc-400">{m.label}</span>
              <span className="text-zinc-500 tabular-nums">
                {m.volume.toLocaleString("de-DE")} KG
              </span>
            </div>
          ))}
        </div>
      )}

      <div className="space-y-2">
        <Link href="/workouts" className="block">
          <Button className="w-full h-12 rounded-xl font-semibold">Done</Button>
        </Link>
        <Link
          href="/workouts/history"
          className="block text-center text-sm text-zinc-500 min-h-11 leading-[2.75rem]"
        >
          Historie
        </Link>
      </div>
    </div>
  );
}
