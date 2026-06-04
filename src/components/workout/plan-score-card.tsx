"use client";

import type { PlanScores } from "@/lib/plan-science-engine";

export function PlanScoreCard({ scores }: { scores: PlanScores }) {
  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4 space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-sm text-zinc-400">Gesamtbewertung</span>
        <span
          className={`text-2xl font-bold ${
            scores.totalScore >= 80
              ? "text-emerald-400"
              : scores.totalScore >= 60
                ? "text-cyan-400"
                : "text-amber-400"
          }`}
        >
          {scores.totalScore}/100
        </span>
      </div>
      <div className="grid grid-cols-2 gap-2 text-xs">
        {(
          [
            ["Effizienz", scores.efficiencyScore],
            ["Wissenschaft", scores.scienceScore],
            ["Regeneration", scores.recoveryScore],
            ["Volumen", scores.volumeScore],
          ] as const
        ).map(([label, val]) => (
          <div key={label} className="rounded-lg bg-white/5 px-2 py-1.5">
            <span className="text-zinc-500">{label}</span>
            <div className="mt-1 h-1.5 rounded-full bg-zinc-800">
              <div
                className="h-full rounded-full bg-cyan-500"
                style={{ width: `${val}%` }}
              />
            </div>
          </div>
        ))}
      </div>
      {scores.rationale.length > 0 && (
        <ul className="text-xs text-zinc-400 space-y-1 list-disc pl-4">
          {scores.rationale.slice(0, 3).map((r, i) => (
            <li key={i}>{r}</li>
          ))}
        </ul>
      )}
      {scores.warnings.length > 0 && (
        <ul className="text-xs text-amber-400/90 space-y-1">
          {scores.warnings.map((w, i) => (
            <li key={i}>⚠ {w}</li>
          ))}
        </ul>
      )}
    </div>
  );
}
