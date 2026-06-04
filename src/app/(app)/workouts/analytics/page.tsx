"use client";

import { useCachedFetch } from "@/hooks/use-cached-fetch";
import Link from "next/link";
import { WorkoutNav } from "@/components/workout/workout-nav";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { LazyStatChart } from "@/components/charts/lazy-stat-chart";
import { GymCheckInPanel } from "@/components/workouts/gym-checkin-panel";
import { Activity, HeartPulse } from "lucide-react";

export default function WorkoutAnalyticsPage() {
  const { data: analytics } = useCachedFetch<{
    volumeByDay: { label: string; value: number }[];
    setsPerWeek: { label: string; value: number }[];
    repsPerWeek: { label: string; value: number }[];
    trainingStreak: { currentDays: number; longestDays: number } | null;
    checkIn?: import("@/lib/gym-checkin").GymCheckInStats;
    warnings?: { message: string; severity: string }[];
    muscleHeatmap?: { muscle: string; volume: number }[];
  }>("workouts-analytics-full", "/api/workouts/analytics", 60_000);
  const { data: recovery } = useCachedFetch<{
    recovery: { label: string; recoveryPercent: number; status: string }[];
    deloadRecommended: boolean;
    fatigueScore: number;
  }>("workouts-recovery", "/api/workouts/recovery", 60_000);
  const warnings = analytics?.warnings ?? [];
  const heatmap = analytics?.muscleHeatmap ?? [];

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-white">Trainingsstatistik</h1>
      <WorkoutNav />

      {analytics?.checkIn && <GymCheckInPanel stats={analytics.checkIn} />}

      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader>
            <CardDescription>Streak</CardDescription>
            <CardTitle className="text-3xl">
              {analytics?.trainingStreak?.currentDays ?? 0} Tage
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>Ermüdung</CardDescription>
            <CardTitle className="text-3xl flex items-center gap-2">
              <HeartPulse className="text-orange-400" />
              {recovery?.fatigueScore ?? 0}%
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      {analytics?.volumeByDay && (
        <Card>
          <CardHeader>
            <CardTitle>Gewichtsentwicklung / Volumen (30 Tage)</CardTitle>
          </CardHeader>
          <CardContent>
            <LazyStatChart data={analytics.volumeByDay} />
          </CardContent>
        </Card>
      )}

      {analytics?.setsPerWeek && (
        <Card>
          <CardHeader>
            <CardTitle>Sätze pro Woche</CardTitle>
          </CardHeader>
          <CardContent>
            <LazyStatChart data={analytics.setsPerWeek} color="#22d3ee" />
          </CardContent>
        </Card>
      )}

      {warnings.length > 0 && (
        <Card className="border-amber-500/30">
          <CardHeader>
            <CardTitle className="text-base">Fortschritts-Warnungen</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 text-sm text-amber-200/90">
            {warnings.map((w, i) => (
              <p key={i}>{w.message}</p>
            ))}
          </CardContent>
        </Card>
      )}

      {heatmap.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Muskelgruppen-Heatmap</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {heatmap.map((m) => {
              const max = heatmap[0]?.volume ?? 1;
              return (
                <div key={m.muscle}>
                  <div className="flex justify-between text-xs mb-1">
                    <span>{m.muscle}</span>
                    <span>{m.volume.toLocaleString("de-DE")}</span>
                  </div>
                  <div className="h-2 rounded-full bg-zinc-800">
                    <div
                      className="h-full rounded-full bg-cyan-500"
                      style={{ width: `${(m.volume / max) * 100}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

      {recovery?.recovery && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="text-cyan-400" /> Muskelgruppen-Erholung
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {recovery.recovery.map((m) => (
              <div key={m.label}>
                <div className="flex justify-between text-sm mb-1">
                  <span>{m.label}</span>
                  <span className="text-zinc-500">{m.recoveryPercent}%</span>
                </div>
                <div className="h-2 rounded-full bg-zinc-800 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${
                      m.status === "ready"
                        ? "bg-emerald-500"
                        : m.status === "recovering"
                          ? "bg-amber-500"
                          : "bg-red-500"
                    }`}
                    style={{ width: `${m.recoveryPercent}%` }}
                  />
                </div>
              </div>
            ))}
            {recovery.deloadRecommended && (
              <p className="text-sm text-orange-300 mt-2">Deload-Woche empfohlen.</p>
            )}
          </CardContent>
        </Card>
      )}

      <p className="text-sm text-zinc-500">
        Pro-Übung-Statistik: In der{" "}
        <Link href="/workouts/exercises" className="text-cyan-400 hover:underline">
          Übungsdatenbank
        </Link>{" "}
        eine Übung öffnen.
      </p>
    </div>
  );
}
