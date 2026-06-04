"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

type Goal = {
  id: string;
  title: string;
  targetValue?: number;
  currentValue?: number;
  unit?: string;
  completed: boolean;
};

export default function GoalsPage() {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [title, setTitle] = useState("");
  const [target, setTarget] = useState("");

  function load() {
    fetch("/api/goals")
      .then((r) => r.json())
      .then((d) => setGoals(d.goals ?? []));
  }

  useEffect(() => {
    load();
  }, []);

  async function addGoal() {
    const res = await fetch("/api/goals", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title,
        targetValue: target ? Number(target) : undefined,
        unit: "kg",
      }),
    });
    if (!res.ok) {
      toast.error("Fehler");
      return;
    }
    toast.success("Ziel erstellt");
    setTitle("");
    setTarget("");
    load();
  }

  async function updateProgress(id: string, current: number) {
    await fetch("/api/goals", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, currentValue: current }),
    });
    load();
  }

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-white">Ziele</h1>
      <Card>
        <CardHeader>
          <CardTitle>Neues Ziel</CardTitle>
        </CardHeader>
        <CardContent className="flex gap-4 flex-wrap">
          <div>
            <Label>Titel</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>
          <div>
            <Label>Zielwert</Label>
            <Input value={target} onChange={(e) => setTarget(e.target.value)} type="number" />
          </div>
          <Button className="self-end" onClick={addGoal}>
            Erstellen
          </Button>
        </CardContent>
      </Card>
      <div className="grid gap-4 md:grid-cols-2">
        {goals.map((g) => {
          const pct = g.targetValue
            ? Math.min(100, ((g.currentValue ?? 0) / g.targetValue) * 100)
            : 0;
          return (
            <Card key={g.id}>
              <CardHeader>
                <CardTitle>{g.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-zinc-400 mb-2">
                  {g.currentValue ?? 0} / {g.targetValue ?? "—"} {g.unit}
                </p>
                <div className="h-2 rounded-full bg-zinc-800 mb-4">
                  <div className="h-2 rounded-full bg-cyan-500" style={{ width: `${pct}%` }} />
                </div>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => updateProgress(g.id, (g.currentValue ?? 0) + 1)}
                >
                  Fortschritt +1
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
