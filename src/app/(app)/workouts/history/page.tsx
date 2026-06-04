"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LazyStatChart } from "@/components/charts/lazy-stat-chart";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { WorkoutNav } from "@/components/workout/workout-nav";
import { ArrowLeft, Copy, Pencil, Trash2, Calendar } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { de } from "date-fns/locale";

type Session = {
  id: string;
  name: string;
  completedAt: string;
  durationSec: number | null;
  notes: string | null;
  sets: { reps: number | null; weightKg: number | null }[];
};

type Warning = { type: string; message: string; severity: string };

export default function HistoryPage() {
  const [data, setData] = useState<{
    sessions: Session[];
    weekCharts: { label: string; volume: number; sets: number }[];
    muscleHeatmap: { muscle: string; volume: number }[];
    warnings: Warning[];
    totalDurationMin: number;
  } | null>(null);
  const [q, setQ] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");

  const load = useCallback(() => {
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (from) params.set("from", from);
    if (to) params.set("to", to);
    fetch(`/api/workouts/history?${params}`).then((r) => r.json()).then(setData);
  }, [q, from, to]);

  useEffect(() => {
    load();
  }, [load]);

  async function duplicate(id: string) {
    const res = await fetch("/api/workouts/sessions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "start",
        name: "Dupliziertes Training",
        duplicateSessionId: id,
      }),
    });
    const d = await res.json();
    if (res.ok) {
      toast.success("Workout dupliziert");
      window.location.href = `/workouts/live/${d.session.id}`;
    }
  }

  async function remove(id: string) {
    if (!confirm("Workout endgültig löschen?")) return;
    await fetch(`/api/workouts/sessions/${id}`, { method: "DELETE" });
    toast.success("Gelöscht");
    load();
  }

  async function saveEdit(id: string) {
    await fetch(`/api/workouts/sessions/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "editSession", name: editName }),
    });
    setEditingId(null);
    toast.success("Gespeichert");
    load();
  }

  return (
    <div className="space-y-6">
      <Link href="/workouts" className="text-cyan-400 text-sm flex items-center gap-1">
        <ArrowLeft className="h-4 w-4" /> Training
      </Link>
      <WorkoutNav />
      <div className="flex flex-wrap justify-between gap-4">
        <h1 className="text-3xl font-bold text-white">Trainingshistorie</h1>
        <Link href="/workouts/calendar">
          <Button variant="outline" size="sm">
            <Calendar className="h-4 w-4 mr-1" /> Kalender
          </Button>
        </Link>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <Input placeholder="Suche..." value={q} onChange={(e) => setQ(e.target.value)} />
        <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
        <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
      </div>

      {data?.warnings && data.warnings.length > 0 && (
        <Card className="border-amber-500/30">
          <CardHeader>
            <CardTitle className="text-base text-amber-200">Trainings-Warnungen</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 text-sm">
            {data.warnings.map((w, i) => (
              <p key={i} className={w.severity === "critical" ? "text-red-400" : "text-amber-300/90"}>
                {w.message}
              </p>
            ))}
          </CardContent>
        </Card>
      )}

      {data?.weekCharts && (
        <Card>
          <CardHeader>
            <CardTitle>Wochenvolumen</CardTitle>
          </CardHeader>
          <CardContent>
            <LazyStatChart
              data={data.weekCharts.map((w) => ({ label: w.label, value: w.volume }))}
              type="bar"
            />
          </CardContent>
        </Card>
      )}

      {data?.muscleHeatmap && data.muscleHeatmap.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Muskelgruppen-Heatmap (Volumen)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {data.muscleHeatmap.map((m) => {
              const max = data.muscleHeatmap[0]?.volume ?? 1;
              return (
                <div key={m.muscle}>
                  <div className="flex justify-between text-xs mb-1">
                    <span>{m.muscle}</span>
                    <span className="text-zinc-500">{m.volume.toLocaleString("de-DE")}</span>
                  </div>
                  <div className="h-2 rounded-full bg-zinc-800">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-cyan-600 to-cyan-400"
                      style={{ width: `${(m.volume / max) * 100}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

      <p className="text-zinc-400">
        {data?.sessions.length ?? 0} Workouts · {data?.totalDurationMin ?? 0} Minuten
      </p>

      <div className="space-y-3">
        {data?.sessions.map((s) => {
          const vol = s.sets.reduce(
            (a, set) => a + (set.reps ?? 0) * (set.weightKg ?? 0),
            0
          );
          return (
            <Card key={s.id}>
              <CardContent className="flex flex-wrap items-center justify-between gap-4 py-4">
                <div className="flex-1 min-w-0">
                  {editingId === s.id ? (
                    <div className="flex gap-2">
                      <Input value={editName} onChange={(e) => setEditName(e.target.value)} />
                      <Button size="sm" onClick={() => saveEdit(s.id)}>
                        OK
                      </Button>
                    </div>
                  ) : (
                    <>
                      <Link href={`/workouts/summary/${s.id}`} className="font-semibold text-white hover:text-cyan-400">
                        {s.name}
                      </Link>
                      <p className="text-sm text-zinc-500">
                        {s.completedAt
                          ? format(new Date(s.completedAt), "dd.MM.yyyy HH:mm", { locale: de })
                          : "—"}{" "}
                        · {Math.round((s.durationSec ?? 0) / 60)} min · {Math.round(vol)} kg Vol.
                      </p>
                    </>
                  )}
                </div>
                <div className="flex gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => {
                      setEditingId(s.id);
                      setEditName(s.name);
                    }}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button variant="secondary" size="sm" onClick={() => duplicate(s.id)}>
                    <Copy className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => remove(s.id)}>
                    <Trash2 className="h-4 w-4 text-red-400" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
