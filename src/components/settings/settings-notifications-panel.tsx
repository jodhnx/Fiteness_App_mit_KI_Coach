"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Label } from "@/components/ui/label";
import { hapticTap } from "@/lib/haptic";
import {
  mealRemindersEnabled,
  setMealRemindersEnabled,
} from "@/lib/meal-reminders";

const KEYS = {
  push: "nexform:notif-push",
  training: "nexform:notif-training",
  nutrition: "nexform:notif-nutrition",
  progress: "nexform:notif-progress",
} as const;

function readFlag(key: string, fallback = true) {
  if (typeof window === "undefined") return fallback;
  const v = localStorage.getItem(key);
  if (v == null) return fallback;
  return v === "1";
}

function writeFlag(key: string, on: boolean) {
  localStorage.setItem(key, on ? "1" : "0");
}

function Toggle({
  on,
  onToggle,
}: {
  on: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      onClick={onToggle}
      className={`relative h-7 w-12 shrink-0 rounded-full transition-colors ${
        on ? "bg-accent" : "bg-zinc-700"
      }`}
    >
      <span
        className={`absolute top-0.5 h-6 w-6 rounded-full bg-white shadow transition-transform ${
          on ? "left-5" : "left-0.5"
        }`}
      />
    </button>
  );
}

/** Notification preferences — persisted locally; meal reminders wire to browser notifications. */
export function SettingsNotificationsPanel() {
  const [push, setPush] = useState(true);
  const [training, setTraining] = useState(true);
  const [nutrition, setNutrition] = useState(false);
  const [progress, setProgress] = useState(true);

  useEffect(() => {
    setPush(readFlag(KEYS.push, true));
    setTraining(readFlag(KEYS.training, true));
    setNutrition(mealRemindersEnabled() || readFlag(KEYS.nutrition, false));
    setProgress(readFlag(KEYS.progress, true));
  }, []);

  function setPref(
    key: (typeof KEYS)[keyof typeof KEYS],
    setter: (v: boolean) => void,
    next: boolean
  ) {
    hapticTap();
    setter(next);
    writeFlag(key, next);
    toast.success(next ? "Aktiviert" : "Deaktiviert");
  }

  async function toggleNutrition(next: boolean) {
    hapticTap();
    if (next) {
      if (typeof Notification !== "undefined") {
        const perm = await Notification.requestPermission();
        if (perm !== "granted") {
          toast.message("Browser-Berechtigung benötigt");
          return;
        }
      }
      setMealRemindersEnabled(true);
      writeFlag(KEYS.nutrition, true);
      setNutrition(true);
      toast.success("Ernährungserinnerungen an");
      return;
    }
    setMealRemindersEnabled(false);
    writeFlag(KEYS.nutrition, false);
    setNutrition(false);
    toast.success("Ernährungserinnerungen aus");
  }

  const rows: {
    label: string;
    hint: string;
    on: boolean;
    toggle: () => void;
  }[] = [
    {
      label: "In-App-Benachrichtigungen",
      hint: "Glocke im Header, Coach-Hinweise, Freischaltungen",
      on: push,
      toggle: () => setPref(KEYS.push, setPush, !push),
    },
    {
      label: "Trainingserinnerungen",
      hint: "Hinweise zu geplanten Einheiten (In-App)",
      on: training,
      toggle: () => setPref(KEYS.training, setTraining, !training),
    },
    {
      label: "Ernährungserinnerungen",
      hint: "Browser-Hinweise zu Mahlzeiten (Tab offen)",
      on: nutrition,
      toggle: () => void toggleNutrition(!nutrition),
    },
    {
      label: "Fortschrittsbenachrichtigungen",
      hint: "Erfolge, Streaks und Meilensteine",
      on: progress,
      toggle: () => setPref(KEYS.progress, setProgress, !progress),
    },
  ];

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-white">Benachrichtigungen</h2>
        <p className="text-sm text-zinc-500 mt-1">
          Wähle, welche Hinweise du erhalten möchtest. System-Push folgt mit der nativen App.
        </p>
      </div>

      <div className="rounded-2xl border border-white/[0.08] bg-zinc-900/80 divide-y divide-white/[0.06]">
        {rows.map((r) => (
          <div key={r.label} className="flex items-start justify-between gap-3 px-4 py-3.5">
            <div className="min-w-0">
              <Label className="text-sm text-zinc-200">{r.label}</Label>
              <p className="text-[11px] text-zinc-500 mt-0.5 leading-snug">{r.hint}</p>
            </div>
            <Toggle on={r.on} onToggle={r.toggle} />
          </div>
        ))}
      </div>
    </div>
  );
}
