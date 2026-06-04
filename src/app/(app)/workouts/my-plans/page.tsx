"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { WorkoutNav } from "@/components/workout/workout-nav";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  Archive,
  ArchiveRestore,
  ChevronRight,
  Copy,
  Play,
  Plus,
  Trash2,
} from "lucide-react";

type Plan = {
  id: string;
  name: string;
  description: string | null;
  template: string;
  days: { id: string; name: string; exercises: unknown[] }[];
};

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

  async function createEmpty() {
    const countStr = prompt("Wie viele Trainingstage? (1–7)", "3");
    if (!countStr) return;
    const count = Math.min(7, Math.max(1, Number(countStr) || 3));
    const days = Array.from({ length: count }, (_, i) => ({
      name: `Tag ${i + 1}`,
      description: "",
    }));
    const res = await fetch("/api/workouts/plans", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ template: "CUSTOM", name: "Mein Plan", days }),
    });
    const data = await res.json();
    if (res.ok) router.push(`/workouts/plans/${data.plan.id}`);
  }

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
    <div className="space-y-6">
      <div className="flex flex-wrap justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white">Meine Trainingspläne</h1>
          <p className="text-zinc-400">Eigene Kopien – bearbeiten, starten, archivieren</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setShowArchived(!showArchived)}>
            {showArchived ? "Aktive" : "Archiv"}
          </Button>
          <Button onClick={createEmpty}>
            <Plus className="h-4 w-4 mr-1" /> Neuer Plan
          </Button>
        </div>
      </div>
      <WorkoutNav />

      <div className="grid gap-4">
        {plans.map((plan) => (
          <Card key={plan.id} className="hover:border-cyan-500/30 transition-colors">
            <CardHeader>
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle>{plan.name}</CardTitle>
                  <CardDescription>
                    {plan.description || plan.template} · {plan.days.length} Tage
                  </CardDescription>
                </div>
                <div className="flex gap-1">
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
            <CardContent className="space-y-2">
              {plan.days.map((day) => (
                <div
                  key={day.id}
                  className="flex items-center justify-between rounded-lg bg-white/5 px-3 py-2"
                >
                  <div>
                    <p className="font-medium text-white">{day.name}</p>
                    <p className="text-xs text-zinc-500">{day.exercises.length} Übungen</p>
                  </div>
                  {!showArchived && (
                    <Button
                      size="sm"
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
        ))}
      </div>

      {plans.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center text-zinc-500">
            {showArchived ? "Keine archivierten Pläne." : "Noch keine Pläne."}
            <div className="mt-4">
              <Link href="/workouts/catalog">
                <Button>Plan aus Bibliothek wählen</Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
