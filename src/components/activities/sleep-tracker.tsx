"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Moon } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const HOURS = [6, 7, 8, 9] as const;
const QUALITY = [
  { id: "POOR", label: "Schlecht" },
  { id: "MEDIUM", label: "Mittel" },
  { id: "GOOD", label: "Gut" },
  { id: "EXCELLENT", label: "Sehr gut" },
] as const;

export function SleepTracker({
  avgHours,
  lowNights,
  onSaved,
}: {
  avgHours: number | null;
  lowNights: number;
  onSaved?: () => void;
}) {
  const [hours, setHours] = useState<number>(8);
  const [quality, setQuality] = useState<string>("GOOD");
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    const res = await fetch("/api/activities/sleep", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sleepHours: hours, sleepQuality: quality }),
    });
    setSaving(false);
    if (!res.ok) {
      toast.error("Schlaf konnte nicht gespeichert werden");
      return;
    }
    toast.success("Schlaf eingetragen");
    onSaved?.();
  }

  return (
    <div className="card-premium p-4 space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-white flex items-center gap-2">
          <Moon className="h-4 w-4 text-indigo-400" />
          Schlaf & Regeneration
        </p>
        {avgHours != null && (
          <span className="text-xs text-zinc-500">Ø {avgHours}h · 7 Tage</span>
        )}
      </div>
      {lowNights >= 2 && (
        <p className="text-xs text-amber-200/90 bg-amber-500/10 rounded-lg px-2 py-1.5">
          {lowNights} Nächte unter 6h – KI empfiehlt leichteres Training.
        </p>
      )}
      <div className="flex flex-wrap gap-2">
        {HOURS.map((h) => (
          <button
            key={h}
            type="button"
            onClick={() => setHours(h)}
            className={cn(
              "rounded-lg px-4 py-2 text-sm font-semibold border",
              hours === h
                ? "border-indigo-400 bg-indigo-500/20 text-white"
                : "border-zinc-700 text-zinc-400"
            )}
          >
            {h}h
          </button>
        ))}
      </div>
      <div className="flex flex-wrap gap-1.5">
        {QUALITY.map((q) => (
          <button
            key={q.id}
            type="button"
            onClick={() => setQuality(q.id)}
            className={cn(
              "rounded-full px-3 py-1 text-xs font-medium border",
              quality === q.id
                ? "border-violet-400 bg-violet-500/15 text-violet-200"
                : "border-zinc-700 text-zinc-500"
            )}
          >
            {q.label}
          </button>
        ))}
      </div>
      <Button className="w-full" size="sm" onClick={save} disabled={saving}>
        Schlaf speichern
      </Button>
    </div>
  );
}
