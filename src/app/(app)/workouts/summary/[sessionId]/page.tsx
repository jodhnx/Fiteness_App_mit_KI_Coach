"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { WorkoutNav } from "@/components/workout/workout-nav";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Trophy, TrendingUp, Zap, CheckCircle2 } from "lucide-react";

type Analysis = {
  totalVolumeKg: number;
  completedSets: number;
  totalSets: number;
  durationSec: number;
  effectivenessScore: number;
  effectivenessLabel: string;
  muscleVolume: { label: string; volume: number }[];
  newPRs: { exercise: { name: string }; recordType: string; value: number }[];
  deloadSuggested: boolean;
  notes: string[];
};

export default function WorkoutSummaryPage() {
  const params = useParams();
  const sessionId = params.sessionId as string;
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [sessionName, setSessionName] = useState("");

  useEffect(() => {
    fetch(`/api/workouts/sessions/${sessionId}/summary`)
      .then((r) => r.json())
      .then((d) => {
        setAnalysis(d.analysis);
        setSessionName(d.session?.name ?? "Training");
      });
  }, [sessionId]);

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    return `${m} Min`;
  };

  if (!analysis) {
    return (
      <div className="space-y-4 max-w-lg mx-auto py-10">
        <p className="text-zinc-400 animate-pulse text-center">Zusammenfassung wird geladen…</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-lg mx-auto pb-28">
      <WorkoutNav />
      <div className="rounded-2xl border border-emerald-500/30 bg-emerald-950/20 px-4 py-5">
        <div className="flex items-center gap-2 text-emerald-300">
          <CheckCircle2 className="h-6 w-6" />
          <p className="text-sm font-semibold uppercase tracking-wide">Erfolgreich abgeschlossen</p>
        </div>
        <h1 className="text-2xl font-bold text-white mt-2">Training erfolgreich abgeschlossen.</h1>
        <p className="text-zinc-300 mt-1">{sessionName}</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="border-cyan-500/30 bg-cyan-500/5">
          <CardContent className="pt-6">
            <p className="text-xs text-zinc-500">Volumen</p>
            <p className="text-2xl font-bold text-cyan-400">
              {analysis.totalVolumeKg.toLocaleString("de-DE")} kg
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 flex items-center gap-3">
            <Zap className="text-amber-400 h-8 w-8" />
            <div>
              <p className="text-xs text-zinc-500">Effektivität</p>
              <p className="text-xl font-bold">{analysis.effectivenessScore}%</p>
              <p className="text-sm text-zinc-400">{analysis.effectivenessLabel}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-xs text-zinc-500">Dauer · Sätze</p>
            <p className="text-xl font-bold">
              {formatTime(analysis.durationSec)} · {analysis.completedSets}/{analysis.totalSets}
            </p>
          </CardContent>
        </Card>
      </div>

      {analysis.newPRs.length > 0 && (
        <Card className="border-amber-500/30">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Trophy className="text-amber-400" /> Neue Rekorde
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {analysis.newPRs.map((pr, i) => (
              <p key={i} className="text-sm text-zinc-300">
                {pr.exercise?.name ?? "Übung"} — {pr.recordType}: {pr.value}
              </p>
            ))}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="text-cyan-400" /> Muskelgruppen
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {analysis.muscleVolume.map((m) => (
            <div key={m.label} className="flex justify-between text-sm">
              <span className="text-zinc-300">{m.label}</span>
              <span className="text-zinc-500">{m.volume.toLocaleString("de-DE")} kg Vol.</span>
            </div>
          ))}
        </CardContent>
      </Card>

      {analysis.deloadSuggested && (
        <Card className="border-orange-500/30 bg-orange-500/5">
          <CardContent className="pt-4 text-sm text-orange-200">
            Deload empfohlen: Erholung priorisieren oder Volumen nächste Woche reduzieren.
          </CardContent>
        </Card>
      )}

      {analysis.notes.map((n, i) => (
        <p key={i} className="text-sm text-zinc-400">
          {n}
        </p>
      ))}

      <div className="flex flex-col gap-3">
        <Link href="/home" className="w-full">
          <Button className="w-full h-12 rounded-xl">Zum Dashboard</Button>
        </Link>
        <div className="flex gap-3">
          <Link href="/workouts/history" className="flex-1">
            <Button variant="secondary" className="w-full h-12 rounded-xl">
              Historie
            </Button>
          </Link>
          <Link href="/workouts" className="flex-1">
            <Button variant="secondary" className="w-full h-12 rounded-xl">
              Training
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
