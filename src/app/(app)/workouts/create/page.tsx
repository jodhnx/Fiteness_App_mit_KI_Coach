"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { FullscreenPage } from "@/components/ui/fullscreen-page";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const DAY_NAMES = ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"];

export default function CreatePlanPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [name, setName] = useState("");
  const [dayCount, setDayCount] = useState(3);
  const [loading, setLoading] = useState(false);

  async function save() {
    if (!name.trim()) {
      toast.error("Bitte Planname eingeben");
      return;
    }
    setLoading(true);
    const days = Array.from({ length: dayCount }, (_, i) => ({
      name: `Tag ${i + 1} – ${DAY_NAMES[i % 7]}`,
      description: "Übungen im Plan-Editor hinzufügen",
    }));
    const res = await fetch("/api/workouts/plans", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: name.trim(),
        template: "CUSTOM",
        days,
      }),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) {
      toast.error(data.error ?? "Plan konnte nicht erstellt werden");
      return;
    }
    toast.success("Plan erstellt");
    router.push(`/workouts/plans/${data.plan.id}`);
  }

  return (
    <FullscreenPage
      title="Plan erstellen"
      subtitle={`Schritt ${step} von 2`}
      onBack={step > 1 ? () => setStep(1) : undefined}
    >
      <div className="max-w-lg mx-auto w-full px-4 py-4 space-y-6">
        {step === 1 && (
          <>
            <div>
              <Label htmlFor="planName">Planname</Label>
              <Input
                id="planName"
                className="mt-2 h-12 text-lg"
                placeholder="z. B. Push Pull Legs"
                value={name}
                onChange={(e) => setName(e.target.value)}
                autoFocus
              />
            </div>
            <Button className="w-full h-12" disabled={!name.trim()} onClick={() => setStep(2)}>
              Weiter
            </Button>
          </>
        )}

        {step === 2 && (
          <>
            <div>
              <Label>Trainingstage pro Woche</Label>
              <div className="grid grid-cols-4 gap-2 mt-3">
                {[1, 2, 3, 4, 5, 6, 7].map((n) => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => setDayCount(n)}
                    className={cn(
                      "rounded-xl border py-4 text-center font-bold text-lg",
                      dayCount === n
                        ? "border-cyan-500 bg-cyan-500/10 text-white"
                        : "border-zinc-700 text-zinc-400"
                    )}
                  >
                    {n}
                  </button>
                ))}
              </div>
              <p className="text-xs text-zinc-500 mt-3">
                Im nächsten Schritt fügst du Übungen pro Tag hinzu.
              </p>
            </div>
            <Button className="w-full h-14 text-base" disabled={loading} onClick={save}>
              {loading ? "Speichern…" : "Plan speichern"}
            </Button>
          </>
        )}
      </div>
    </FullscreenPage>
  );
}
