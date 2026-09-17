"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { PageShell } from "@/components/layout/page-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PLAN_DURATIONS } from "@/lib/nutrition-plan-constants";
import { writePlanCache, invalidateNutritionPlanCaches } from "@/lib/nutrition-plan-cache";
import type { PlanDetailDto } from "@/lib/nutrition-plan-types";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export default function NewNutritionPlanPage() {
  const router = useRouter();
  const [name, setName] = useState("Meine Aufbau-Woche");
  const [durationDays, setDurationDays] = useState(7);
  const [startDate, setStartDate] = useState("");
  const [saving, setSaving] = useState(false);

  async function create() {
    if (name.trim().length < 2) {
      toast.error("Bitte einen Plannamen eingeben");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/nutrition/plans", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          durationDays,
          startDate: startDate || null,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        toast.error((err as { error?: string }).error ?? "Erstellen fehlgeschlagen");
        return;
      }
      const data = (await res.json()) as { plan: PlanDetailDto };
      writePlanCache(data.plan);
      invalidateNutritionPlanCaches();
      toast.success("Plan erstellt");
      router.replace(`/nutrition/plans/${data.plan.id}`);
    } catch {
      toast.error("Netzwerkfehler");
    } finally {
      setSaving(false);
    }
  }

  return (
    <PageShell
      title="Ernährungsplan erstellen"
      subtitle="Name, Dauer und optional Startdatum"
      maxWidth="lg"
      className="space-y-5 pb-28"
    >
      <button
        type="button"
        onClick={() => router.push("/nutrition/plans")}
        className="inline-flex items-center text-sm font-medium text-accent -mt-1"
      >
        ← Meine Pläne
      </button>
      <div className="space-y-4 rounded-2xl border border-zinc-200/90 bg-white p-4 shadow-sm dark:border-white/[0.08] dark:bg-white/[0.02]">
        <div>
          <Label htmlFor="plan-name">Planname</Label>
          <Input
            id="plan-name"
            className="mt-1.5 h-12 rounded-xl"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Meine Aufbau-Woche"
            maxLength={80}
          />
        </div>

        <div>
          <Label>Dauer</Label>
          <div className="mt-2 grid grid-cols-3 gap-2 sm:grid-cols-6">
            {PLAN_DURATIONS.map((d) => (
              <button
                key={d}
                type="button"
                onClick={() => setDurationDays(d)}
                className={cn(
                  "min-h-11 rounded-xl border text-sm font-semibold",
                  durationDays === d
                    ? "border-accent bg-accent text-white"
                    : "border-zinc-200 bg-zinc-50 text-zinc-700 dark:border-white/[0.08] dark:bg-white/[0.03] dark:text-zinc-300"
                )}
              >
                {d} {d === 1 ? "Tag" : "Tage"}
              </button>
            ))}
          </div>
          <p className="mt-2 text-[12px] text-zinc-500">
            Standard: 7 Tage — jeder Tag kann unterschiedlich geplant werden.
          </p>
        </div>

        <div>
          <Label htmlFor="start-date">Startdatum (optional)</Label>
          <Input
            id="start-date"
            type="date"
            className="mt-1.5 h-12 rounded-xl"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
          />
        </div>
      </div>

      <Button
        type="button"
        className="h-12 w-full rounded-xl btn-accent font-semibold"
        disabled={saving}
        onClick={() => void create()}
      >
        {saving ? "Wird erstellt…" : "Plan erstellen"}
      </Button>
    </PageShell>
  );
}
