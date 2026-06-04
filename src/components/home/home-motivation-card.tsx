"use client";

import { Sparkles } from "lucide-react";

const QUOTES = [
  "Kleine Schritte jeden Tag schlagen große Sprünge einmal im Jahr.",
  "Du trainierst nicht für heute — du investierst in dein Morgen.",
  "Disziplin ist die Brücke zwischen Zielen und Erfolg.",
  "Jede Mahlzeit ist eine Chance, dein Ziel zu unterstützen.",
  "Regeneration ist Teil des Fortschritts, nicht Pause.",
];

export function HomeMotivationCard({ streakDays }: { streakDays: number }) {
  const dayIndex = new Date().getDate() % QUOTES.length;
  const quote = QUOTES[dayIndex];

  return (
    <div className="rounded-2xl border border-violet-500/20 bg-gradient-to-r from-violet-950/40 via-zinc-900/80 to-cyan-950/30 p-4">
      <p className="text-[10px] uppercase tracking-widest text-violet-300/80 flex items-center gap-1.5 mb-2">
        <Sparkles className="h-3.5 w-3.5" />
        Motivation
      </p>
      <p className="text-sm text-zinc-200 leading-relaxed italic">&ldquo;{quote}&rdquo;</p>
      {streakDays > 0 && (
        <p className="text-xs text-cyan-400/90 mt-2 tabular-nums">
          🔥 {streakDays} Tage in Folge aktiv — weiter so!
        </p>
      )}
    </div>
  );
}
