"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { hapticTap } from "@/lib/haptic";
import type { HealthSyncPrefs } from "@/lib/health/health-sync-preferences";

const LABELS: { key: keyof HealthSyncPrefs; label: string }[] = [
  { key: "steps", label: "Schritte" },
  { key: "sleep", label: "Schlaf" },
  { key: "heartRate", label: "Herzfrequenz" },
  { key: "calories", label: "Kalorien (Aktivität)" },
  { key: "workouts", label: "Workouts" },
  { key: "weight", label: "Gewicht" },
  { key: "distance", label: "Distanz" },
  { key: "activeMinutes", label: "Aktive Minuten" },
  { key: "bloodOxygen", label: "Sauerstoffsättigung" },
  { key: "bodyFat", label: "Körperfett" },
];

function Toggle({
  on,
  disabled,
  onToggle,
}: {
  on: boolean;
  disabled?: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      disabled={disabled}
      onClick={onToggle}
      className={`relative h-7 w-12 shrink-0 rounded-full transition-colors ${
        on ? "bg-accent" : "bg-zinc-700"
      } disabled:opacity-50`}
    >
      <span
        className={`absolute top-0.5 h-6 w-6 rounded-full bg-white shadow transition-transform ${
          on ? "left-5" : "left-0.5"
        }`}
      />
    </button>
  );
}

/** Real privacy controls — wired to /api/health/sync-preferences. */
export function SettingsPrivacyPanel() {
  const [prefs, setPrefs] = useState<HealthSyncPrefs | null>(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(() => {
    void fetch("/api/health/sync-preferences")
      .then((r) => r.json())
      .then((d) => {
        if (d.preferences) setPrefs(d.preferences);
        else if (d.steps != null) setPrefs(d as HealthSyncPrefs);
      })
      .catch(() => toast.error("Datenschutz-Einstellungen nicht geladen"));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function patch(partial: Partial<HealthSyncPrefs>) {
    if (!prefs) return;
    const next = { ...prefs, ...partial };
    setPrefs(next);
    setSaving(true);
    hapticTap();
    try {
      const res = await fetch("/api/health/sync-preferences", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(partial),
      });
      if (!res.ok) {
        toast.error("Speichern fehlgeschlagen");
        load();
        return;
      }
      toast.success("Gespeichert");
    } catch {
      toast.error("Netzwerkfehler");
      load();
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-white">Datenschutz</h2>
        <p className="text-sm text-zinc-500 mt-1">
          Steuere, welche Gesundheitsdaten synchronisiert und in der App genutzt werden
          dürfen.
        </p>
      </div>

      <div className="rounded-2xl border border-white/[0.08] bg-zinc-900/80 divide-y divide-white/[0.06]">
        {LABELS.map(({ key, label }) => (
          <div key={key} className="flex items-center justify-between gap-3 px-4 py-3.5">
            <Label className="text-sm text-zinc-200">{label}</Label>
            <Toggle
              on={prefs ? prefs[key] !== false : true}
              disabled={!prefs || saving}
              onToggle={() =>
                void patch({ [key]: !(prefs?.[key] !== false) } as Partial<HealthSyncPrefs>)
              }
            />
          </div>
        ))}
      </div>

      <p className="text-xs text-zinc-500 leading-relaxed">
        Geräte verbinden und Sync starten findest du unter Geräte & Gesundheit. Ohne
        Zustimmung werden die jeweiligen Kategorien nicht importiert.
      </p>

      <div className="rounded-2xl border border-white/[0.08] bg-zinc-900/80 p-4 space-y-2">
        <p className="text-sm font-medium text-white">Account-Daten</p>
        <p className="text-xs text-zinc-500 leading-relaxed">
          Name, Körperdaten und Ziele bearbeiten. Konto löschen findest du weiter unten.
        </p>
        <Link href="/settings?view=konto" prefetch>
          <Button variant="outline" className="w-full mt-1">
            Konto bearbeiten
          </Button>
        </Link>
      </div>

      <Link href="/geraete" prefetch>
        <Button variant="outline" className="w-full">
          Geräte & Sync öffnen
        </Button>
      </Link>
    </div>
  );
}
