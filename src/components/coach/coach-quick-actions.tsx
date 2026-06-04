"use client";

import { Dumbbell, Apple, Calculator, TrendingUp, Salad } from "lucide-react";

const ACTIONS = [
  {
    label: "Trainingsplan analysieren",
    prompt: "Analysiere meinen aktuellen Trainingsplan und gib mir 3 konkrete Verbesserungen.",
    icon: Dumbbell,
  },
  {
    label: "Ernährung analysieren",
    prompt: "Wie steht meine Ernährung heute und diese Woche? Was soll ich anpassen?",
    icon: Apple,
  },
  {
    label: "Kalorien berechnen",
    prompt: "Berechne mein empfohlenes Kalorienziel basierend auf meinen Profildaten und Zielen.",
    icon: Calculator,
  },
  {
    label: "Muskelaufbau Tipps",
    prompt: "Gib mir 5 evidenzbasierte Tipps für Muskelaufbau passend zu meinem aktuellen Stand.",
    icon: TrendingUp,
  },
  {
    label: "Diät Tipps",
    prompt: "Gib mir einen pragmatischen Plan für Fettabbau ohne Muskelverlust.",
    icon: Salad,
  },
] as const;

const SUGGESTED = [
  "Was soll ich heute essen?",
  "Bin ich bereit für ein schweres Beintraining?",
  "Wie viel Protein brauche ich heute noch?",
  "Wie ist meine Regeneration?",
];

export function CoachQuickActions({
  onAsk,
  disabled,
}: {
  onAsk: (text: string) => void;
  disabled?: boolean;
}) {
  return (
    <div className="space-y-4">
      <div>
        <p className="text-[10px] uppercase tracking-widest text-zinc-500 mb-2">
          Empfohlene Fragen
        </p>
        <div className="flex flex-wrap gap-2">
          {SUGGESTED.map((q) => (
            <button
              key={q}
              type="button"
              disabled={disabled}
              onClick={() => onAsk(q)}
              className="rounded-full border border-white/10 bg-white/5 px-3 py-2 text-xs text-zinc-300 active:bg-white/10 disabled:opacity-50"
            >
              {q}
            </button>
          ))}
        </div>
      </div>
      <div>
        <p className="text-[10px] uppercase tracking-widest text-zinc-500 mb-2">
          Schnelle Aktionen
        </p>
        <div className="grid grid-cols-1 gap-2">
          {ACTIONS.map(({ label, prompt, icon: Icon }) => (
            <button
              key={label}
              type="button"
              disabled={disabled}
              onClick={() => onAsk(prompt)}
              className="flex items-center gap-3 rounded-xl border border-cyan-500/20 bg-cyan-950/20 px-3 py-3 text-left text-sm text-zinc-200 active:bg-cyan-950/40 disabled:opacity-50"
            >
              <Icon className="h-4 w-4 text-cyan-400 shrink-0" />
              {label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
