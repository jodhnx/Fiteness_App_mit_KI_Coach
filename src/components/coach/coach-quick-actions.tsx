"use client";

import {
  Dumbbell,
  Apple,
  Calculator,
  Beef,
  Scale,
  ClipboardList,
} from "lucide-react";

const ACTIONS = [
  {
    label: "Trainingsplan erstellen",
    prompt:
      "Erstelle mir einen strukturierten Trainingsplan basierend auf meinen Zielen, meiner Erfahrung und verfügbaren Trainingstagen.",
    icon: ClipboardList,
  },
  {
    label: "Kalorien analysieren",
    prompt:
      "Analysiere meine heutigen Kalorien und sag mir, ob ich auf Kurs bin — inkl. verbleibender kcal.",
    icon: Calculator,
  },
  {
    label: "Makros prüfen",
    prompt: "Prüfe meine Makros heute (Protein, Carbs, Fett) und gib mir konkrete Empfehlungen.",
    icon: Apple,
  },
  {
    label: "Protein analysieren",
    prompt:
      "Analysiere mein Protein heute — wie viel fehlt noch und welche 3 Lebensmittel empfiehlst du?",
    icon: Beef,
  },
  {
    label: "Gewicht analysieren",
    prompt:
      "Analysiere meine Gewichtsentwicklung und ob mein Tempo zum Zielgewicht passt.",
    icon: Scale,
  },
  {
    label: "Training optimieren",
    prompt: "Analysiere mein Training der letzten Wochen und nenne 3 Verbesserungen.",
    icon: Dumbbell,
  },
] as const;

export function CoachQuickActions({
  onAsk,
  disabled,
  compact,
}: {
  onAsk: (text: string) => void;
  disabled?: boolean;
  compact?: boolean;
}) {
  return (
    <div className={compact ? "space-y-2" : "space-y-3"}>
      <p className="text-[10px] uppercase tracking-widest text-zinc-500 font-semibold">
        Schnellaktionen
      </p>
      <div className={cnGrid(compact)}>
        {ACTIONS.map(({ label, prompt, icon: Icon }) => (
          <button
            key={label}
            type="button"
            disabled={disabled}
            onClick={() => onAsk(prompt)}
            className="flex items-center gap-2.5 rounded-xl border border-white/10 bg-zinc-900/80 px-3 py-2.5 text-left text-sm text-zinc-200 active:bg-zinc-800 disabled:opacity-50 min-h-[44px]"
          >
            <Icon className="h-4 w-4 text-cyan-400 shrink-0" />
            <span className="leading-tight">{label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

function cnGrid(compact?: boolean) {
  return compact
    ? "grid grid-cols-2 gap-2"
    : "grid grid-cols-1 sm:grid-cols-2 gap-2";
}
