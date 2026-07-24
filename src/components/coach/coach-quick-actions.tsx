"use client";

import {
  Dumbbell,
  Apple,
  Calculator,
  Beef,
  TrendingUp,
  TrendingDown,
  Moon,
  Heart,
  Footprints,
  LineChart,
  Sparkles,
  RefreshCw,
} from "lucide-react";

const ACTIONS = [
  {
    label: "Trainingsanalyse",
    prompt:
      "Analysiere mein Training der letzten 7–14 Tage: Frequenz, Volumen, Muskelgruppen-Balance, Regeneration und mögliche Überlastung. Gib 3 konkrete Anpassungen.",
    icon: Dumbbell,
  },
  {
    label: "Ernährungsanalyse",
    prompt:
      "Analysiere meine heutige und wöchentliche Ernährung: Kalorien, Protein, Timing. Vergleiche mit meinem Ziel und gib 3 Verbesserungen.",
    icon: Apple,
  },
  {
    label: "Plateau checken",
    prompt:
      "Prüfe ob ich in einem Plateau stecke (Gewicht, Kraft, Schritte). Falls ja: Ursachen und 3 Strategien zum Durchbrechen.",
    icon: LineChart,
  },
  {
    label: "Schlaf analysieren",
    prompt:
      "Analysiere meinen Schlaf der letzten Woche und den Einfluss auf Training & Erholung. Gib konkrete Schlaf-Hygiene-Tipps.",
    icon: Moon,
  },
  {
    label: "Schritte & NEAT",
    prompt:
      "Bewerte meine Schrittzahl und alltägliche Bewegung (NEAT) im Kontext Kalorienziel. Wie viele Schritte brauche ich heute noch?",
    icon: Footprints,
  },
  {
    label: "Herzfrequenz",
    prompt:
      "Interpretiere meinen Ruhepuls / Herzfrequenz-Kontext für Trainingstauglichkeit heute. Intensität empfehlen (leicht/moderat/intensiv).",
    icon: Heart,
  },
  {
    label: "Regeneration",
    prompt:
      "Bewerte meine Regeneration (Schlaf, Ruhepuls, Muskel-Recovery). Soll ich heute hart trainieren, leicht oder pausieren?",
    icon: RefreshCw,
  },
  {
    label: "Ziel anpassen",
    prompt:
      "Schlage eine automatische Zielanpassung vor (Kalorien/Protein/Trainingstage) basierend auf meinem aktuellen Fortschritt und Compliance.",
    icon: Sparkles,
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
  {
    label: "Wochenbericht",
    prompt:
      "Erstelle einen persönlichen Wochenbericht: Training, Ernährung, Schlaf, Schritte, Gewicht. Motiviere und setze 3 Fokus-Punkte für nächste Woche.",
    icon: LineChart,
  },
  {
    label: "Motivation",
    prompt:
      "Gib mir einen kurzen, persönlichen Motivationstipp basierend auf meinem aktuellen Streak, Ziel und heutigen Daten. Keine Floskeln.",
    icon: Sparkles,
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
        Coach 2.0 · Schnellaktionen
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
