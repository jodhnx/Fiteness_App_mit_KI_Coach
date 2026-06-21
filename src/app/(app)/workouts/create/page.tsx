"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { FullscreenPage } from "@/components/ui/fullscreen-page";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { invalidateCache } from "@/lib/client-cache";
import { CACHE_KEYS } from "@/lib/cache-manager";
import {
  PLAN_FOCUS_OPTIONS,
  TRAINING_WEEKDAYS,
  type PlanFocusId,
} from "@/lib/workout-categories";

export default function CreatePlanPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [focus, setFocus] = useState<PlanFocusId>("PUSH");
  const [weekdays, setWeekdays] = useState<number[]>([]);

  function toggleWeekday(id: number) {
    setWeekdays((prev) =>
      prev.includes(id) ? prev.filter((d) => d !== id) : [...prev, id]
    );
  }

  async function save() {
    if (!name.trim()) {
      toast.error("Bitte einen Plannamen eingeben");
      return;
    }
    if (weekdays.length === 0) {
      toast.error("Mindestens einen Trainingstag wählen");
      return;
    }

    const focusLabel = PLAN_FOCUS_OPTIONS.find((f) => f.id === focus)?.label ?? focus;
    const sortedDays = [...weekdays].sort((a, b) => a - b);
    const days = sortedDays.map((wd) => {
      const weekday = TRAINING_WEEKDAYS.find((w) => w.id === wd);
      return {
        name: weekday?.label ?? `Tag ${wd + 1}`,
        description: focusLabel,
      };
    });

    const res = await fetch("/api/workouts/plans", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: name.trim(),
        template: "CUSTOM",
        description: focusLabel,
        days,
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      toast.error(data.error ?? "Plan konnte nicht erstellt werden");
      return;
    }

    invalidateCache(CACHE_KEYS.PLANS_LIST);
    invalidateCache("workouts-my-plans-hub");
    router.push(`/workouts/plans/${data.plan.id}`);
  }

  return (
    <FullscreenPage title="Neuen Plan erstellen" subtitle="Name, Fokus & Trainingstage">
      <div className="max-w-lg mx-auto w-full px-4 py-4 space-y-8">
        <div>
          <Label htmlFor="planName">Name</Label>
          <Input
            id="planName"
            className="mt-2 h-14 text-lg rounded-2xl"
            placeholder="z. B. Sommer Push"
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoFocus
          />
        </div>

        <div>
          <Label>Fokus</Label>
          <div className="grid grid-cols-2 gap-2 mt-3">
            {PLAN_FOCUS_OPTIONS.map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => setFocus(opt.id)}
                className={cn(
                  "rounded-2xl border px-4 py-3 text-left transition-colors active:scale-[0.98]",
                  focus === opt.id
                    ? "border-cyan-500 bg-cyan-500/15 text-white"
                    : "border-zinc-800 bg-zinc-900/60 text-zinc-400"
                )}
              >
                <span className="font-semibold block">{opt.label}</span>
              </button>
            ))}
          </div>
        </div>

        <div>
          <Label>Trainingstage</Label>
          <div className="grid grid-cols-4 gap-2 mt-3 sm:grid-cols-7">
            {TRAINING_WEEKDAYS.map((day) => (
              <button
                key={day.id}
                type="button"
                onClick={() => toggleWeekday(day.id)}
                className={cn(
                  "rounded-xl border py-3 text-center text-sm font-medium transition-colors active:scale-[0.98]",
                  weekdays.includes(day.id)
                    ? "border-cyan-500 bg-cyan-500/15 text-white"
                    : "border-zinc-800 bg-zinc-900/60 text-zinc-400"
                )}
              >
                {day.short}
              </button>
            ))}
          </div>
          <p className="text-xs text-zinc-500 mt-2">
            Der Plan startet leer — du fügst Übungen selbst hinzu.
          </p>
        </div>

        <Button
          className="w-full h-14 text-base rounded-2xl"
          disabled={!name.trim() || weekdays.length === 0}
          onClick={() => void save()}
        >
          Erstellen
        </Button>
      </div>
    </FullscreenPage>
  );
}
