"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { FullscreenPage } from "@/components/ui/fullscreen-page";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  WORKOUT_CATEGORIES,
  dayForCategory,
  type WorkoutCategoryId,
} from "@/lib/workout-categories";

export default function CreatePlanPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [category, setCategory] = useState<WorkoutCategoryId>("PUSH");
  const [loading, setLoading] = useState(false);

  async function save() {
    if (!name.trim()) {
      toast.error("Bitte Workout-Name eingeben");
      return;
    }
    setLoading(true);
    const day = dayForCategory(category);
    const res = await fetch("/api/workouts/plans", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: name.trim(),
        template: "CUSTOM",
        days: [{ name: day.name, description: day.description }],
      }),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) {
      toast.error(data.error ?? "Workout konnte nicht erstellt werden");
      return;
    }
    router.push(`/workouts/plans/${data.plan.id}`);
  }

  return (
    <FullscreenPage title="Workout erstellen" subtitle="Name & Kategorie — fertig">
      <div className="max-w-lg mx-auto w-full px-4 py-4 space-y-8">
        <div>
          <Label htmlFor="workoutName">Workout Name</Label>
          <Input
            id="workoutName"
            className="mt-2 h-14 text-lg rounded-2xl"
            placeholder="z. B. Montag Push"
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoFocus
          />
        </div>

        <div>
          <Label>Kategorie</Label>
          <div className="grid grid-cols-2 gap-2 mt-3">
            {WORKOUT_CATEGORIES.map((cat) => (
              <button
                key={cat.id}
                type="button"
                onClick={() => setCategory(cat.id)}
                className={cn(
                  "rounded-2xl border px-4 py-4 text-left transition-colors active:scale-[0.98]",
                  category === cat.id
                    ? "border-cyan-500 bg-cyan-500/15 text-white"
                    : "border-zinc-800 bg-zinc-900/60 text-zinc-400"
                )}
              >
                <span className="font-semibold block">{cat.label}</span>
                {cat.description && (
                  <span className="text-[11px] text-zinc-500 mt-0.5 block">{cat.description}</span>
                )}
              </button>
            ))}
          </div>
        </div>

        <Button
          className="w-full h-14 text-base rounded-2xl"
          disabled={!name.trim() || loading}
          onClick={save}
        >
          {loading ? "Speichern…" : "Workout speichern"}
        </Button>
      </div>
    </FullscreenPage>
  );
}
