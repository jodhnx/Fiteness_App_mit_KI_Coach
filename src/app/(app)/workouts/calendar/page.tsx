"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { WorkoutNav } from "@/components/workout/workout-nav";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar, Play } from "lucide-react";
import { format } from "date-fns";
import { de } from "date-fns/locale";

type CalendarData = {
  completed: { id: string; name: string; completedAt: string; durationSec: number | null }[];
  upcoming: {
    planId: string;
    dayId: string;
    planName: string;
    dayName: string;
    exerciseCount: number;
    suggestedDate: string;
  }[];
  lastWorkoutAt: string | null;
};

export default function WorkoutCalendarPage() {
  const router = useRouter();
  const [data, setData] = useState<CalendarData | null>(null);

  useEffect(() => {
    fetch("/api/workouts/calendar").then((r) => r.json()).then(setData);
  }, []);

  async function start(planId: string, dayId: string, name: string) {
    const res = await fetch("/api/workouts/sessions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "start", workoutPlanId: planId, workoutDayId: dayId, name }),
    });
    const d = await res.json();
    if (res.ok) router.push(`/workouts/live/${d.session.id}`);
  }

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-white flex items-center gap-2">
        <Calendar className="text-cyan-400" /> Trainingskalender
      </h1>
      <WorkoutNav />

      {data?.lastWorkoutAt && (
        <p className="text-sm text-zinc-400">
          Letztes Training:{" "}
          {format(new Date(data.lastWorkoutAt), "PPP", { locale: de })}
        </p>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Kommende Workouts</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {data?.upcoming.map((u) => (
            <div
              key={u.dayId}
              className="flex items-center justify-between rounded-lg bg-white/5 px-3 py-3"
            >
              <div>
                <p className="font-medium text-white">
                  {u.planName} — {u.dayName}
                </p>
                <p className="text-xs text-zinc-500">
                  {u.suggestedDate} · {u.exerciseCount} Übungen
                </p>
              </div>
              <Button size="sm" onClick={() => start(u.planId, u.dayId, `${u.planName} – ${u.dayName}`)}>
                <Play className="h-4 w-4" />
              </Button>
            </div>
          ))}
          {!data?.upcoming.length && (
            <p className="text-zinc-500 text-sm">Lege einen aktiven Plan an, um Vorschläge zu sehen.</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Diese Woche erledigt</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {data?.completed.map((s) => (
            <div key={s.id} className="rounded-lg bg-cyan-500/10 border border-cyan-500/20 px-3 py-2 text-sm">
              <p className="text-white">{s.name}</p>
              <p className="text-zinc-500 text-xs">
                {s.completedAt &&
                  format(new Date(s.completedAt), "EEE HH:mm", { locale: de })}
                {s.durationSec ? ` · ${Math.round(s.durationSec / 60)} Min` : ""}
              </p>
            </div>
          ))}
          {!data?.completed.length && (
            <p className="text-zinc-500 text-sm">Noch keine Workouts diese Woche.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
