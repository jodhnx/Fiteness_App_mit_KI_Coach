"use client";

import {
  Dumbbell,
  Apple,
  Calculator,
  Beef,
  TrendingUp,
  TrendingDown,
} from "lucide-react";

const ACTIONS = [
  {
    label: "Trainingsplan erstellen",
    prompt:
      "Erstelle mir einen individuellen Trainingsplan basierend auf meinem Ziel, meiner Erfahrung, Trainingstagen pro Woche und Regenerationsstatus. Gib Wochenstruktur mit Übungen, Sätzen und Wdh.",
    icon: Dumbbell,
  },
  {
    label: "Kalorien berechnen",
    prompt:
      "Wie viele Kalorien soll ich täglich essen? Berechne individuell aus meinem Gewicht, Größe, Alter, Geschlecht, Aktivität und Ziel (Bulk/Cut/Maintain). Gib konkrete kcal.",
    icon: Calculator,
  },
  {
    label: "Makros berechnen",
    prompt:
      "Berechne meine optimalen Makros (Protein, Kohlenhydrate, Fett) für mein aktuelles Ziel. Nutze meine Profildaten und gib Gramm pro Tag.",
    icon: Apple,
  },
  {
    label: "Protein berechnen",
    prompt:
      "Wie viel Protein brauche ich täglich? Berechne aus Gewicht und Ziel, vergleiche mit meinem heutigen Verzehr und nenne 3 konkrete Proteinquellen.",
    icon: Beef,
  },
  {
    label: "Bulk analysieren",
    prompt:
      "Analysiere ob mein aktueller Bulk optimal läuft: Kalorienüberschuss, Protein, Gewichtstrend, Training. Gib 3 Verbesserungen.",
    icon: TrendingUp,
  },
  {
    label: "Cut analysieren",
    prompt:
      "Analysiere meinen Cut: Kaloriendefizit, Makros, Gewichtstrend, Muskel-Erhalt. Rate Defizit-Stärke und gib 3 Tipps.",
    icon: TrendingDown,
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
            <Icon className="h-4 w-4 text-cyan-400 shrink-0" aria-hidden />
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
