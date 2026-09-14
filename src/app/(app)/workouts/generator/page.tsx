"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { WorkoutNav } from "@/components/workout/workout-nav";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Sparkles } from "lucide-react";
import { wInput, wMuted, wTitle } from "@/lib/workout-ui";
import { cn } from "@/lib/utils";

export default function PlanGeneratorPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    goal: "MUSCLE_GAIN",
    weightKg: 75,
    heightCm: 175,
    experience: "INTERMEDIATE",
    daysPerWeek: 4,
    durationMinutes: 60,
    equipment: "GYM",
  });

  async function generate() {
    setLoading(true);
    const res = await fetch("/api/workouts/ai-plan-generator", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setLoading(false);
    const data = await res.json();
    if (!res.ok) {
      toast.error(data.error ?? "Generierung fehlgeschlagen");
      return;
    }
    toast.success("KI-Plan erstellt");
    router.push(`/workouts/plans/${data.plan.id}`);
  }

  return (
    <div className="space-y-6 max-w-lg">
      <h1 className={cn("text-3xl font-bold flex items-center gap-2", wTitle)}>
        <Sparkles className="text-cyan-400" /> KI Trainingsplan
      </h1>
      <WorkoutNav />
      <Card>
        <CardHeader>
          <CardTitle>Deine Parameter</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className={cn("text-sm", wMuted)}>Ziel</label>
            <select
              className={cn("w-full mt-1 rounded-lg border px-3 py-2", wInput)}
              value={form.goal}
              onChange={(e) => setForm({ ...form, goal: e.target.value })}
            >
              <option value="MUSCLE_GAIN">Muskelaufbau</option>
              <option value="STRENGTH_GAIN">Kraftaufbau</option>
              <option value="FAT_LOSS">Fettabbau</option>
              <option value="RECOMP">Body Recomposition</option>
              <option value="GENERAL_FITNESS">Allgemeine Fitness</option>
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={cn("text-sm", wMuted)}>Gewicht (kg)</label>
              <Input
                type="number"
                value={form.weightKg}
                onChange={(e) => setForm({ ...form, weightKg: Number(e.target.value) })}
              />
            </div>
            <div>
              <label className={cn("text-sm", wMuted)}>Größe (cm)</label>
              <Input
                type="number"
                value={form.heightCm}
                onChange={(e) => setForm({ ...form, heightCm: Number(e.target.value) })}
              />
            </div>
          </div>
          <div>
            <label className={cn("text-sm", wMuted)}>Erfahrung</label>
            <select
              className={cn("w-full mt-1 rounded-lg border px-3 py-2", wInput)}
              value={form.experience}
              onChange={(e) => setForm({ ...form, experience: e.target.value })}
            >
              <option value="BEGINNER">Beginner</option>
              <option value="INTERMEDIATE">Intermediate</option>
              <option value="ADVANCED">Advanced</option>
              <option value="PRO">Pro</option>
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={cn("text-sm", wMuted)}>Tage/Woche</label>
              <Input
                type="number"
                min={2}
                max={6}
                value={form.daysPerWeek}
                onChange={(e) => setForm({ ...form, daysPerWeek: Number(e.target.value) })}
              />
            </div>
            <div>
              <label className={cn("text-sm", wMuted)}>Dauer (Min)</label>
              <Input
                type="number"
                value={form.durationMinutes}
                onChange={(e) => setForm({ ...form, durationMinutes: Number(e.target.value) })}
              />
            </div>
          </div>
          <div>
            <label className={cn("text-sm", wMuted)}>Equipment</label>
            <select
              className={cn("w-full mt-1 rounded-lg border px-3 py-2", wInput)}
              value={form.equipment}
              onChange={(e) => setForm({ ...form, equipment: e.target.value })}
            >
              <option value="GYM">Gym</option>
              <option value="HOME_GYM">Home Gym</option>
              <option value="DUMBBELLS_ONLY">Kurzhanteln</option>
              <option value="CALISTHENICS">Calisthenics</option>
            </select>
          </div>
          <Button className="w-full" onClick={generate} disabled={loading}>
            {loading ? "KI erstellt Plan..." : "Plan generieren & speichern"}
          </Button>
          <p className={cn("text-xs text-center", wMuted)}>
            Danach kannst du den Plan bearbeiten und ein Workout starten.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
