"use client";

import {
  Dumbbell,
  Apple,
  Scale,
  LineChart,
  Sparkles,
} from "lucide-react";
import type { CoachContextMode } from "@/lib/coach-actions";

export type CoachQuickAction = {
  label: string;
  prompt: string;
  contextMode: CoachContextMode;
  icon: typeof Apple;
};

export const COACH_QUICK_ACTIONS: CoachQuickAction[] = [
  {
    label: "Was soll ich heute essen?",
    prompt:
      "Was soll ich heute noch essen? Nutze meine aktuellen Kalorien/Makros und mein Ziel. Schlage 2–3 konkrete Mahlzeiten oder Snacks vor.",
    contextMode: "nutrition",
    icon: Apple,
  },
  {
    label: "Was soll ich heute trainieren?",
    prompt:
      "Was soll ich heute trainieren? Berücksichtige mein Ziel, letzte Sessions, Regeneration und verfügbare Muskelgruppen. Gib einen konkreten Plan für heute.",
    contextMode: "training",
    icon: Dumbbell,
  },
  {
    label: "Wie läuft meine Woche?",
    prompt:
      "Analysiere meine Woche: Gewicht, Kalorien, Protein, Training, Schritte, Schlaf, Regeneration und Fortschritt. Gib 3–5 konkrete Empfehlungen.",
    contextMode: "weekly",
    icon: LineChart,
  },
  {
    label: "Warum stagniert mein Gewicht?",
    prompt:
      "Warum stagniert mein Gewicht? Analysiere Kalorien, Protein, Schritte, Schlaf und Training der letzten Wochen. Nenne die wahrscheinlichsten Ursachen und 3 konkrete Fixes.",
    contextMode: "weight",
    icon: Scale,
  },
  {
    label: "Erstelle/optimiere meinen Trainingsplan",
    prompt:
      "Erstelle oder optimiere meinen Trainingsplan anhand Ziel, Erfahrung, Frequenz, Volumen, Muskelbalance und Regeneration. Schlage einen klaren Wochenplan vor.",
    contextMode: "plan",
    icon: Sparkles,
  },
];

export function CoachQuickActions({
  onAsk,
  disabled,
  compact,
}: {
  onAsk: (text: string, contextMode?: CoachContextMode) => void;
  disabled?: boolean;
  compact?: boolean;
}) {
  return (
    <div className={compact ? "space-y-2" : "space-y-3"}>
      <p className="text-[10px] uppercase tracking-widest text-zinc-400 font-semibold">
        Schnellzugriffe
      </p>
      <div
        className={
          compact
            ? "grid grid-cols-1 gap-2"
            : "grid grid-cols-1 sm:grid-cols-2 gap-2"
        }
      >
        {COACH_QUICK_ACTIONS.map(({ label, prompt, contextMode, icon: Icon }) => (
          <button
            key={label}
            type="button"
            disabled={disabled}
            onClick={() => onAsk(prompt, contextMode)}
            className="flex items-center gap-2.5 rounded-xl border border-white/10 bg-zinc-900/80 px-3 py-2.5 text-left text-sm text-zinc-200 active:bg-zinc-800 disabled:opacity-50 min-h-[44px]"
          >
            <Icon className="h-4 w-4 text-cyan-400 shrink-0" aria-hidden />
            <span className="leading-tight">{label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
